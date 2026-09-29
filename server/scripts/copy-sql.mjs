/**
 * TypeScript only emits .js, so SQL files that ship alongside the compiled
 * output have to be copied into dist/ or the migration runner cannot find them
 * in a production image. Run automatically by `npm run build`.
 */
import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '..', 'src', 'db');
const to = join(here, '..', 'dist', 'db');

const sqlFiles = (await readdir(from)).filter((file) => file.endsWith('.sql'));

if (sqlFiles.length === 0) {
  console.error('[build] no .sql files found in src/db — nothing to copy');
  process.exit(1);
}

await mkdir(to, { recursive: true });
for (const file of sqlFiles) {
  await cp(join(from, file), join(to, file));
  console.log(`[build] copied ${file} -> dist/db/${file}`);
}
