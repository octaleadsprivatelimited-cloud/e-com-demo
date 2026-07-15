import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * StoreService — durable document store.
 * ──────────────────────────────────────
 * Backed by PostgreSQL when DATABASE_URL is set (production/scale), and by
 * local JSON files otherwise (zero-config dev). Same synchronous read/write
 * interface either way, so no resource service had to change.
 *
 * Data model in Postgres: one JSONB row per collection in `kv_store`. On first
 * connect, any existing local .data/*.json is imported so demo/seed data
 * carries over. Writes are cached in memory and persisted through to Postgres.
 *
 * NOTE (scale): this preserves the collection-array read/modify/write model, so
 * it is durable + shared via one DB, but multi-instance real-time cache
 * coherence and row-level concurrency are the next step (per-request reads /
 * row-level upserts). Documented for the follow-up.
 */
@Injectable()
export class StoreService {
  private readonly logger = new Logger('Store');
  private readonly dir = path.join(process.cwd(), '.data');
  private readonly cache = new Map<string, any[]>();
  private pool: Pool | null = null;
  public backend: 'postgres' | 'file' = 'file';

  /** Called by the async provider factory BEFORE any dependent is created. */
  async init(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (url) {
      try {
        this.pool = new Pool({
          connectionString: url,
          max: 10,
          connectionTimeoutMillis: 5000,
        });
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS kv_store (
            collection  TEXT PRIMARY KEY,
            data        JSONB NOT NULL DEFAULT '[]'::jsonb,
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);
        const res = await this.pool.query('SELECT collection, data FROM kv_store');
        for (const row of res.rows) this.cache.set(row.collection, row.data);
        this.backend = 'postgres';
        this.importLocalFilesIfMissing();
        this.logger.log(
          `Store backed by PostgreSQL (${this.cache.size} collection(s) loaded)`,
        );
        return;
      } catch (e: any) {
        this.logger.error(
          `PostgreSQL unavailable — falling back to file store. ${e?.message}`,
        );
        this.pool = null;
      }
    }
    this.backend = 'file';
    this.hydrateFromFiles();
    this.logger.log(
      'Store backed by local files (set DATABASE_URL to use PostgreSQL).',
    );
  }

  // ─── Public interface (synchronous, served from the in-memory cache) ──
  read<T = any>(collection: string, fallback: T[] = []): T[] {
    return (this.cache.get(collection) as T[]) ?? fallback;
  }

  write<T = any>(collection: string, data: T[]): void {
    this.cache.set(collection, data as any[]);
    this.persist(collection, data);
  }

  /** Seed a collection only if it has never existed (matches previous semantics). */
  seedIfEmpty<T = any>(collection: string, seed: T[]): void {
    if (!this.cache.has(collection)) this.write(collection, seed);
  }

  // ─── Internals ────────────────────────────────────────────────────────
  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }
  private file(collection: string): string {
    return path.join(this.dir, `${collection}.json`);
  }

  private hydrateFromFiles(): void {
    this.ensureDir();
    for (const f of fs.readdirSync(this.dir)) {
      if (!f.endsWith('.json')) continue;
      try {
        this.cache.set(
          f.replace(/\.json$/, ''),
          JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8')),
        );
      } catch {
        /* skip unreadable files */
      }
    }
  }

  /** One-time migration: import any local .data/*.json not yet in Postgres. */
  private importLocalFilesIfMissing(): void {
    if (!fs.existsSync(this.dir)) return;
    for (const f of fs.readdirSync(this.dir)) {
      if (!f.endsWith('.json')) continue;
      const collection = f.replace(/\.json$/, '');
      if (this.cache.has(collection)) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8'));
        this.cache.set(collection, data);
        this.persist(collection, data);
        this.logger.log(
          `Imported '${collection}' from file into PostgreSQL (${data.length} row(s)).`,
        );
      } catch {
        /* skip */
      }
    }
  }

  private persist(collection: string, data: any[]): void {
    if (this.backend === 'postgres' && this.pool) {
      this.pool
        .query(
          `INSERT INTO kv_store (collection, data, updated_at)
           VALUES ($1, $2::jsonb, now())
           ON CONFLICT (collection) DO UPDATE
             SET data = EXCLUDED.data, updated_at = now()`,
          [collection, JSON.stringify(data)],
        )
        .catch((e) =>
          this.logger.error(`persist '${collection}' failed: ${e?.message}`),
        );
    } else {
      try {
        this.ensureDir();
        fs.writeFileSync(this.file(collection), JSON.stringify(data, null, 2), 'utf8');
      } catch (e: any) {
        this.logger.error(`file persist '${collection}' failed: ${e?.message}`);
      }
    }
  }
}
