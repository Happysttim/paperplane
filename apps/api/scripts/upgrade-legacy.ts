import { readFile } from 'node:fs/promises';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { pool } from '../src/database';
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(
    await readFile(new URL('./upgrade-legacy.sql', import.meta.url), 'utf8'),
  );
  await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.query(
    'CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint, name text, applied_at timestamp with time zone DEFAULT now())',
  );
  const baseline = new Set([
    '20261016130031_curvy_shadow_king',
    '20261016130247_chemical_power_man',
  ]);
  for (const migration of readMigrationFiles({
    migrationsFolder: './migration',
  })) {
    if (!baseline.has(migration.name!)) continue;
    await client.query(
      'INSERT INTO drizzle.__drizzle_migrations(hash, created_at, name) VALUES ($1, $2, $3)',
      [migration.hash, migration.folderMillis, migration.name],
    );
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
