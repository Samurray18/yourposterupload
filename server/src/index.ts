import fs from 'node:fs';
import { createApp } from './app.js';
import { config } from './config.js';
import { assertDatabaseReachable, pool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { loadMailContext } from './services/mailer.js';
import { uploadsDir } from './lib/paths.js';

/**
 * Populate an empty database so a fresh `docker compose up` has a browsable
 * catalogue. Once real products exist the seed is never re-run, so admin edits
 * (prices, stock, activations) are safe.
 */
async function seedIfEmpty(): Promise<void> {
  const { rows } = await pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM products',
  );
  if (Number(rows[0]?.count ?? '0') === 0) {
    console.log('[api] empty database detected — loading the starter catalogue');
    await seed();
  }
}

async function main(): Promise<void> {
  // The schema is idempotent, so applying it on boot keeps a fresh Docker
  // volume and an existing database on the same code path.
  await migrate();
  await assertDatabaseReachable();
  await seedIfEmpty();
  await loadMailContext();

  fs.mkdirSync(uploadsDir, { recursive: true });

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port} (${config.env})`);
    console.log(`[api] storefront allowed from: ${config.corsOrigins.join(', ')}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
    // Never hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
