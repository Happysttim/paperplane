import database, { pool } from '../src/database';
import { domains } from '../src/schema';
import { z } from 'zod';
const names = z
  .array(z.hostname().transform((value) => value.toLowerCase()))
  .min(1)
  .parse(process.argv.slice(2));
try {
  await database
    .insert(domains)
    .values(names.map((name) => ({ name })))
    .onConflictDoNothing();
} finally {
  await pool.end();
}
