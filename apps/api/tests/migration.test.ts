import { expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

it('upgrades the checkpoint schema without losing accounts or rules', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile('tests/fixtures/legacy-schema.sql', 'utf8'));
    await db.exec(`
      INSERT INTO users (name, user_email) VALUES ('tester', 'old@example.com');
      INSERT INTO domains (name) VALUES ('paper.test');
      INSERT INTO emails (user_id, src_email, domain_id) VALUES (1, 'old@paper.test', 1);
      INSERT INTO forwards (email_id, forward_email) VALUES (1, 'dest@example.com');
      INSERT INTO sessions (refresh_hash, expires_at) VALUES ('legacy-token', now() + interval '1 day');
    `);
    await db.exec('BEGIN');
    await db.exec(await readFile('scripts/upgrade-legacy.sql', 'utf8'));
    await db.exec('COMMIT');
    expect((await db.query('SELECT user_email FROM users')).rows).toEqual([
      { user_email: 'old@example.com' },
    ]);
    expect((await db.query('SELECT forward_email FROM forwards')).rows).toEqual(
      [{ forward_email: 'dest@example.com' }],
    );
    expect((await db.query('SELECT revoke FROM legacy_sessions')).rows).toEqual(
      [{ revoke: true }],
    );
    expect((await db.query('SELECT * FROM sessions')).rows).toEqual([]);
    await db.exec(
      "INSERT INTO emails (user_id, src_email, domain_id) VALUES (1, 'second@paper.test', 1)",
    );
    await db.exec('DELETE FROM users WHERE id = 1');
    expect((await db.query('SELECT * FROM forwards')).rows).toEqual([]);
    expect((await db.query('SELECT * FROM emails')).rows).toEqual([]);
  } finally {
    await db.close();
  }
});
