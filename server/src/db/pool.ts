import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

// Postgres returns BIGINT (int8) as a string by default so that 64-bit values
// are not silently truncated. Every int8 in this schema is a small count or a
// DZD amount well under Number.MAX_SAFE_INTEGER, so parsing to number is safe
// and keeps the JSON payloads free of surprise strings.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));
// NUMERIC (used for prices) likewise.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number.parseFloat(value));

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: config.isProd && !config.databaseUrl.includes('localhost')
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

export type QueryParam = string | number | boolean | null | Date | Buffer | object | Array<string | number>;

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: QueryParam[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}

/** Convenience helper: first row or null. */
export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: QueryParam[] = [],
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run `fn` inside a transaction, rolling back on any thrown error. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function assertDatabaseReachable(): Promise<void> {
  await pool.query('SELECT 1');
}
