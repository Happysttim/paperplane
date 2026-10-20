import { migrate } from 'drizzle-orm/node-postgres/migrator';
import database, { pool } from '../src/database';
try {
  await migrate(database, { migrationsFolder: './migration' });
} finally {
  await pool.end();
}
