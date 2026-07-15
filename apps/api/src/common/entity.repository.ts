import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * EntityRepository — per-row, indexed storage (the scale layer).
 * ─────────────────────────────────────────────────────────────
 * Each record is ONE row in `entities(collection, id, data JSONB)`, with
 * expression indexes on the hot lookup fields (mobile, ownerId, customerId,
 * email). Reads/writes touch a single indexed row — so a customer buying
 * credits updates one row, not a whole-collection blob. This is what lets
 * Postgres serve tens of millions of records efficiently.
 *
 * On first run it auto-migrates data from the legacy `kv_store` blob table.
 */
@Injectable()
export class EntityRepository {
  private readonly logger = new Logger('Entities');
  private pool: Pool | null = null;
  ready = false;

  async init(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) {
      this.logger.warn('DATABASE_URL not set — per-row repository disabled.');
      return;
    }
    this.pool = new Pool({ connectionString: url, max: 20, connectionTimeoutMillis: 5000 });
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS entities (
        collection TEXT NOT NULL,
        id         TEXT NOT NULL,
        data       JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (collection, id)
      )`);
    // Expression indexes on the fields we actually query by.
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_collection ON entities (collection)`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_mobile   ON entities (collection, (data->>'mobile'))`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_owner    ON entities (collection, (data->>'ownerId'))`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_customer ON entities (collection, (data->>'customerId'))`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_email    ON entities (collection, (data->>'email'))`);
    this.ready = true;
    await this.migrateFromBlob();
    this.logger.log('Per-row entity store ready (PostgreSQL, indexed).');
  }

  /** One-time: explode legacy kv_store arrays into per-row entities. */
  private async migrateFromBlob(): Promise<void> {
    if (!this.pool) return;
    let blob: any[];
    try {
      const res = await this.pool.query(`SELECT collection, data FROM kv_store`);
      blob = res.rows;
    } catch {
      return; // no legacy table — nothing to migrate
    }
    for (const row of blob) {
      const collection = row.collection as string;
      const { rows } = await this.pool.query(
        `SELECT 1 FROM entities WHERE collection = $1 LIMIT 1`,
        [collection],
      );
      if (rows.length) continue; // already migrated
      const items: any[] = Array.isArray(row.data) ? row.data : [];
      let n = 0;
      for (const item of items) {
        if (!item?.id) continue;
        await this.insert(collection, item);
        n++;
      }
      if (n) this.logger.log(`Migrated ${n} '${collection}' record(s) into per-row store.`);
    }
  }

  // ─── Row-level operations (all single-row, indexed) ───────────────────
  async findById<T = any>(collection: string, id: string): Promise<T | undefined> {
    const { rows } = await this.pool!.query(
      `SELECT data FROM entities WHERE collection = $1 AND id = $2`,
      [collection, id],
    );
    return rows[0]?.data;
  }

  async findBy<T = any>(collection: string, field: string, value: string): Promise<T | undefined> {
    const { rows } = await this.pool!.query(
      `SELECT data FROM entities WHERE collection = $1 AND data->>$2 = $3 LIMIT 1`,
      [collection, field, String(value)],
    );
    return rows[0]?.data;
  }

  async findManyBy<T = any>(
    collection: string,
    field: string,
    value: string,
    limit = 5000,
    offset = 0,
  ): Promise<T[]> {
    const { rows } = await this.pool!.query(
      `SELECT data FROM entities WHERE collection = $1 AND data->>$2 = $3
       ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
      [collection, field, String(value), limit, offset],
    );
    return rows.map((r) => r.data);
  }

  /** Indexed count for one field value (e.g. contacts owned by a tenant). */
  async countBy(collection: string, field: string, value: string): Promise<number> {
    const { rows } = await this.pool!.query(
      `SELECT count(*)::int AS c FROM entities WHERE collection = $1 AND data->>$2 = $3`,
      [collection, field, String(value)],
    );
    return rows[0]?.c ?? 0;
  }

  async all<T = any>(collection: string, limit = 5000, offset = 0): Promise<T[]> {
    const { rows } = await this.pool!.query(
      `SELECT data FROM entities WHERE collection = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [collection, limit, offset],
    );
    return rows.map((r) => r.data);
  }

  async count(collection: string): Promise<number> {
    const { rows } = await this.pool!.query(
      `SELECT count(*)::int AS c FROM entities WHERE collection = $1`,
      [collection],
    );
    return rows[0]?.c ?? 0;
  }

  async insert<T = any>(collection: string, entity: T & { id: string }): Promise<T> {
    await this.pool!.query(
      `INSERT INTO entities (collection, id, data) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [collection, (entity as any).id, JSON.stringify(entity)],
    );
    return entity;
  }

  /**
   * Bulk upsert in batched multi-row INSERTs (chunked to stay within Postgres'
   * parameter limit). Returns the rows that were newly inserted — existing
   * (collection, id) rows are skipped, so callers using a deterministic id get
   * free de-duplication with no prior read. Scales to large imports.
   */
  async insertMany<T = any>(collection: string, entities: Array<T & { id: string }>): Promise<Array<T & { id: string }>> {
    if (!entities.length) return [];
    // Collapse duplicate ids within the batch (last wins) so a single INSERT
    // never lists the same (collection,id) twice.
    const byId = new Map<string, T & { id: string }>();
    for (const e of entities) byId.set(e.id, e);
    const unique = [...byId.values()];

    const CHUNK = 500; // 3 params/row → 1500 params/chunk, well under the 65535 cap
    const inserted: Array<T & { id: string }> = [];
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const values: any[] = [];
      const tuples = chunk.map((e, j) => {
        const b = j * 3;
        values.push(collection, e.id, JSON.stringify(e));
        return `($${b + 1}, $${b + 2}, $${b + 3}::jsonb)`;
      });
      const { rows } = await this.pool!.query(
        `INSERT INTO entities (collection, id, data) VALUES ${tuples.join(', ')}
         ON CONFLICT (collection, id) DO NOTHING RETURNING id`,
        values,
      );
      const ids = new Set(rows.map((r) => r.id));
      for (const e of chunk) if (ids.has(e.id)) inserted.push(e);
    }
    return inserted;
  }

  /** Shallow-merge a partial into the row's JSONB (atomic single-row update). */
  async patch<T = any>(collection: string, id: string, partial: Record<string, any>): Promise<T | undefined> {
    const { rows } = await this.pool!.query(
      `UPDATE entities SET data = data || $3::jsonb, updated_at = now()
       WHERE collection = $1 AND id = $2 RETURNING data`,
      [collection, id, JSON.stringify(partial)],
    );
    return rows[0]?.data;
  }

  async remove(collection: string, id: string): Promise<boolean> {
    const res = await this.pool!.query(
      `DELETE FROM entities WHERE collection = $1 AND id = $2`,
      [collection, id],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async removeManyBy(collection: string, field: string, value: string): Promise<number> {
    const res = await this.pool!.query(
      `DELETE FROM entities WHERE collection = $1 AND data->>$2 = $3`,
      [collection, field, String(value)],
    );
    return res.rowCount ?? 0;
  }

  /** Seed only if the collection has no rows yet. */
  async seedIfEmpty<T = any>(collection: string, seed: Array<T & { id: string }>): Promise<void> {
    if ((await this.count(collection)) > 0) return;
    for (const item of seed) await this.insert(collection, item);
  }
}
