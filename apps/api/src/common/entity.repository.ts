import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
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
export class EntityRepository implements OnApplicationShutdown {
  private readonly logger = new Logger('Entities');
  private pool: Pool | null = null;
  ready = false;

  async init(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) {
      this.logger.warn('DATABASE_URL not set — per-row repository disabled.');
      return;
    }
    this.pool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX || 20),
      min: Number(process.env.DB_POOL_MIN || 2),
      connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
      statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 15000),
      query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS || 20000),
      application_name: process.env.APP_NAME || 'poltica-api',
    });
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS entities (
        collection TEXT NOT NULL,
        id         TEXT NOT NULL,
        data       JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (collection, id)
      )`);
    // Stored hot-path columns let PostgreSQL use stable B-tree indexes even
    // when the repository field is selected dynamically.
    await this.pool.query(`ALTER TABLE entities
      ADD COLUMN IF NOT EXISTS mobile TEXT GENERATED ALWAYS AS (data->>'mobile') STORED,
      ADD COLUMN IF NOT EXISTS owner_id TEXT GENERATED ALWAYS AS (data->>'ownerId') STORED,
      ADD COLUMN IF NOT EXISTS customer_id TEXT GENERATED ALWAYS AS (data->>'customerId') STORED,
      ADD COLUMN IF NOT EXISTS email TEXT GENERATED ALWAYS AS (data->>'email') STORED`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_collection_created ON entities (collection, created_at DESC)`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_mobile   ON entities (collection, mobile) WHERE mobile IS NOT NULL`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_owner    ON entities (collection, owner_id, created_at DESC) WHERE owner_id IS NOT NULL`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_customer ON entities (collection, customer_id, created_at DESC) WHERE customer_id IS NOT NULL`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_entities_email    ON entities (collection, email) WHERE email IS NOT NULL`);
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
    const column = this.indexedColumn(field);
    const { rows } = await this.pool!.query(
      column
        ? `SELECT data FROM entities WHERE collection = $1 AND ${column} = $2 LIMIT 1`
        : `SELECT data FROM entities WHERE collection = $1 AND data->>$2 = $3 LIMIT 1`,
      column ? [collection, String(value)] : [collection, field, String(value)],
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
    const column = this.indexedColumn(field);
    const { rows } = await this.pool!.query(
      column
        ? `SELECT data FROM entities WHERE collection = $1 AND ${column} = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`
        : `SELECT data FROM entities WHERE collection = $1 AND data->>$2 = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
      column
        ? [collection, String(value), this.safeLimit(limit), Math.max(0, offset)]
        : [collection, field, String(value), this.safeLimit(limit), Math.max(0, offset)],
    );
    return rows.map((r) => r.data);
  }

  /** Indexed count for one field value (e.g. contacts owned by a tenant). */
  async countBy(collection: string, field: string, value: string): Promise<number> {
    const column = this.indexedColumn(field);
    const { rows } = await this.pool!.query(
      column
        ? `SELECT count(*)::int AS c FROM entities WHERE collection = $1 AND ${column} = $2`
        : `SELECT count(*)::int AS c FROM entities WHERE collection = $1 AND data->>$2 = $3`,
      column ? [collection, String(value)] : [collection, field, String(value)],
    );
    return rows[0]?.c ?? 0;
  }

  async all<T = any>(collection: string, limit = 5000, offset = 0): Promise<T[]> {
    const { rows } = await this.pool!.query(
      `SELECT data FROM entities WHERE collection = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [collection, this.safeLimit(limit), Math.max(0, offset)],
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

  /** Serialize balance changes so simultaneous sends cannot overspend credits. */
  async adjustBalances<T = any>(
    collection: string,
    id: string,
    delta: Partial<Record<'sms' | 'wa' | 'ivr', number>>,
  ): Promise<T | undefined> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT data FROM entities WHERE collection = $1 AND id = $2 FOR UPDATE`,
        [collection, id],
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const entity = rows[0].data;
      const balances = { sms: 0, wa: 0, ivr: 0, ...(entity.balances || {}) };
      for (const channel of ['sms', 'wa', 'ivr'] as const) {
        const change = Number(delta[channel] || 0);
        const next = Number(balances[channel] || 0) + change;
        if (!Number.isFinite(next) || next < 0) throw new Error(`INSUFFICIENT_BALANCE:${channel}`);
        balances[channel] = next;
      }
      entity.balances = balances;
      const updated = await client.query(
        `UPDATE entities SET data = $3::jsonb, updated_at = now()
         WHERE collection = $1 AND id = $2 RETURNING data`,
        [collection, id, JSON.stringify(entity)],
      );
      await client.query('COMMIT');
      return updated.rows[0]?.data;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async incrementNumber<T = any>(collection: string, id: string, field: string, amount: number): Promise<T | undefined> {
    const { rows } = await this.pool!.query(
      `UPDATE entities
       SET data = jsonb_set(data, ARRAY[$3], to_jsonb(COALESCE((data->>$3)::numeric, 0) + $4::numeric)),
           updated_at = now()
       WHERE collection = $1 AND id = $2 RETURNING data`,
      [collection, id, field, amount],
    );
    return rows[0]?.data;
  }

  /**
   * Exactly-once payment finalization. The provider payment claim, immutable
   * receipt, credit grant, and cumulative payment update share one transaction.
   */
  async finalizePayment<TCandidate = any, TPayment extends { id: string } = any>(input: {
    candidateCollection: string;
    candidateId: string;
    paymentCollection: string;
    payment: TPayment;
    credits: { sms: number; wa: number; ivr: number };
    amount: number;
  }): Promise<{ duplicate: boolean; candidate: TCandidate; payment: TPayment }> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const claimed = await client.query(
        `INSERT INTO entities (collection, id, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (collection, id) DO NOTHING RETURNING data`,
        [input.paymentCollection, input.payment.id, JSON.stringify(input.payment)],
      );
      if (!claimed.rowCount) {
        const existing = await client.query(
          `SELECT data FROM entities WHERE collection = $1 AND id = $2`,
          [input.paymentCollection, input.payment.id],
        );
        const candidate = await client.query(
          `SELECT data FROM entities WHERE collection = $1 AND id = $2`,
          [input.candidateCollection, input.candidateId],
        );
        await client.query('COMMIT');
        return { duplicate: true, candidate: candidate.rows[0]?.data, payment: existing.rows[0]?.data };
      }

      const locked = await client.query(
        `SELECT data FROM entities WHERE collection = $1 AND id = $2 FOR UPDATE`,
        [input.candidateCollection, input.candidateId],
      );
      if (!locked.rows[0]) throw new Error('PAYMENT_OWNER_NOT_FOUND');
      const candidate = locked.rows[0].data;
      const balances = { sms: 0, wa: 0, ivr: 0, ...(candidate.balances || {}) };
      for (const channel of ['sms', 'wa', 'ivr'] as const) {
        const delta = Number(input.credits[channel]);
        if (!Number.isSafeInteger(delta) || delta < 0) throw new Error('INVALID_PAYMENT_CREDITS');
        balances[channel] = Number(balances[channel] || 0) + delta;
      }
      candidate.balances = balances;
      candidate.payments = Number(candidate.payments || 0) + input.amount;
      const updated = await client.query(
        `UPDATE entities SET data = $3::jsonb, updated_at = now()
         WHERE collection = $1 AND id = $2 RETURNING data`,
        [input.candidateCollection, input.candidateId, JSON.stringify(candidate)],
      );
      await client.query('COMMIT');
      return { duplicate: false, candidate: updated.rows[0].data, payment: input.payment };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  async healthCheck(): Promise<boolean> {
    if (!this.pool || !this.ready) return false;
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.ready = false;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }

  private safeLimit(limit: number): number {
    return Math.min(5000, Math.max(1, Number(limit) || 100));
  }

  private indexedColumn(field: string): string | undefined {
    return ({ mobile: 'mobile', ownerId: 'owner_id', customerId: 'customer_id', email: 'email' } as Record<string, string>)[field];
  }
}
