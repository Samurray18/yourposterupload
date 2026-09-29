import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { pool } from './pool.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * `schema.sql` sits next to this file in `src/`, and the build script copies it
 * into `dist/`, so the same relative lookup works under tsx and compiled node.
 */
const schemaPath = join(here, 'schema.sql');

async function dropEverything(): Promise<void> {
  console.log('[migrate] dropping existing tables (--reset)…');
  await pool.query(`
    DROP TABLE IF EXISTS order_deliveries, order_items, orders,
                     product_denominations, product_sales,
                     products, categories, settings CASCADE;
    DROP FUNCTION IF EXISTS touch_updated_at CASCADE;
  `);
}

export async function migrate(): Promise<void> {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('[migrate] schema is up to date');
}

// Only run migrations when this file is the entrypoint — `npm run db:migrate`.
// Importing `migrate()` from the server boot sequence must not re-run it.
const entrypoint = process.argv[1] ? resolve(process.argv[1]) : '';
if (entrypoint === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--reset')) await dropEverything();
    await migrate();
  } catch (err) {
    console.error('[migrate] failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
