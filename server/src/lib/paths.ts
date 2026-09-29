import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Runtime directories, resolved from the compiled location so `dist` and `src` both work. */
export const uploadsDir = path.resolve(here, '../uploads');
