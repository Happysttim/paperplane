import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
const state = vi.hoisted(() => ({
  cache: new Map<string, { value: string; expires?: number }>(),
  mail: [] as { to: string; code: string }[],
  failMail: false,
}));
vi.mock('@/redis', () => {
  const read = (key: string) => {
    const v = state.cache.get(key);
    if (v?.expires && v.expires <= Date.now()) {
      state.cache.delete(key);
      return null;
    }
    return v?.value ?? null;
  };
  const redis = {
    get: async (key: string) => read(key),
    getdel: async (key: string) => {
      const v = read(key);
      state.cache.delete(key);
      return v;
    },
    del: async (key: string) => Number(state.cache.delete(key)),
    exists: async (key: string) => Number(read(key) !== null),
    ttl: async (key: string) => {
      read(key);
      const v = state.cache.get(key);
      return !v
        ? -2
        : v.expires
          ? Math.ceil((v.expires - Date.now()) / 1000)
          : -1;
    },
    set: async (key: string, value: string, ...args: (string | number)[]) => {
      if (args.includes('NX') && read(key) !== null) return null;
      const i = args.indexOf('EX');
      state.cache.set(key, {
        value,
        expires: i < 0 ? undefined : Date.now() + Number(args[i + 1]) * 1000,
      });
      return 'OK';
    },
    eval: async (_script: string, _count: number, key: string) => {
      const n = Number(read(key) ?? 0) + 1;
      state.cache.set(key, {
        value: String(n),
        expires: state.cache.get(key)?.expires ?? Date.now() + 60000,
      });
      return n;
    },
    ping: async () => 'PONG',
  };
  return {
    redis,
    get: redis.get,
    getdel: redis.getdel,
    del: async (key: string) => !!(await redis.del(key)),
    exists: async (key: string) => !!(await redis.exists(key)),
    ttl: redis.ttl,
    setTTL: async (key: string, value: string, ttl: number) =>
      (await redis.set(key, value, 'EX', ttl)) === 'OK',
  };
});
vi.mock('@/mailer', () => ({
  sendVerifyMail: async (to: string, template: { verifyCode: string }) => {
    state.mail.push({ to, code: template.verifyCode });
    return !state.failMail;
  },
}));
vi.mock('@/provider', () => ({
  google: {
    token: async () => ({
      token_type: 'Bearer',
      access_token: 'google-access',
    }),
    user: async () => ({ sub: 'google-person' }),
  },
  naver: {
    token: async () => ({ token_type: 'Bearer', access_token: 'naver-access' }),
    user: async () => ({
      response: { id: 'naver-person' },
      resultcode: '00',
      message: 'success',
    }),
  },
}));
vi.mock('@/database', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { relations } = await import('../src/schema');
  const { readdir, readFile } = await import('node:fs/promises');
  const client = new PGlite();
  for (const folder of (await readdir('migration')).sort())
    await client.exec(
      await readFile('migration/' + folder + '/migration.sql', 'utf8'),
    );
  return {
    default: drizzle({ client, relations }),
    pool: { end: () => client.close() },
  };
});
import { app } from '../src/app';
import router from '../src/route';
app.use(router);
import database, { pool } from '../src/database';
import { domains, users, sessions } from '../src/schema';
import { sql } from 'drizzle-orm';
import { generateHmac, sha256 } from '../src/utils/hash';
import { createRefreshClaims } from '../src/jwt/utils';
import jwt from '../src/jwt';
let server: Server;
let base: string;
beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No server');
  base = 'http://127.0.0.1:' + address.port;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
beforeEach(async () => {
  state.cache.clear();
  state.mail.length = 0;
  state.failMail = false;
  await database.execute(
    sql.raw('TRUNCATE users, domains RESTART IDENTITY CASCADE'),
  );
  await database.insert(domains).values({ name: 'paper.test' });
});
class Client {
  cookies = new Map<string, string>();
  csrf = '';
  access = '';
  async call(
    path: string,
    method = 'GET',
    body?: unknown,
    extra: Record<string, string> = {},
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        cookie: [...this.cookies]
          .map(([key, value]) => key + '=' + value)
          .join('; '),
        ...(this.csrf ? { 'x-paperplane-csrf': this.csrf } : {}),
        ...(this.access ? { authorization: 'Bearer ' + this.access } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0]!;
      const index = pair.indexOf('=');
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const json = await response.json();
    if (json.data?.csrfToken) this.csrf = json.data.csrfToken;
    if (json.data?.accessToken) this.access = json.data.accessToken;
    return { httpStatus: response.status, ...json };
  }
  async register(address = 'one@example.com') {
    await this.call('/api/v1/auth/csrf');
    const verify = await this.call('/api/v1/verify/email', 'POST', {
      type: 'register',
      email: address,
    });
    expect(verify.status).toBe('ok');
    const headers = { 'x-paperplane-verify': verify.data.verifyToken };
    expect(
      (
        await this.call(
          '/api/v1/verify/code',
          'POST',
          { code: state.mail.at(-1)!.code },
          headers,
        )
      ).status,
    ).toBe('ok');
    const registered = await this.call(
      '/api/v1/auth/register',
      'POST',
      {
        provider: 'local',
        email: address,
        name: '테스터',
        password: 'password!1',
        passwordConfirm: 'password!1',
      },
      headers,
    );
    expect(registered.status).toBe('ok');
    expect(typeof this.access).toBe('string');
    expect(this.access.length).toBeGreaterThan(20);
    return registered;
  }
}
const signed = async (
  path: string,
  body: unknown,
  overrides: Record<string, string> = {},
) => {
  const raw = JSON.stringify(body);
  const id = randomUUID();
  const timestamp = String(Date.now());
  const headers = {
    'content-type': 'application/json',
    'x-request-id': id,
    'x-paperplane-timestamp': timestamp,
    'x-paperplane-signature': generateHmac(
      ['POST', path, id, timestamp, sha256(raw)].join('.'),
    ),
    ...overrides,
  };
  const response = await fetch(base + path, {
    method: 'POST',
    headers,
    body: raw,
  });
  return { response, headers, body: await response.json() };
};
const mail = {
  headers: [],
  envelope: { from: 'sender@example.com', recipients: ['alias@paper.test'] },
  from: { name: 'Sender', address: 'sender@example.com' },
  subject: 'invoice',
  date: '2026-10-16T00:00:00Z',
  content: 'hello',
  attachments: [],
  contentSize: 5,
};
async function destination(client: Client) {
  const challenge = await client.call('/api/v1/destinations/verify', 'POST', {
    address: 'dest@example.com',
  });
  expect(challenge.status).toBe('ok');
  const confirmed = await client.call('/api/v1/destinations/confirm', 'POST', {
    verificationToken: challenge.data.verificationToken,
    code: state.mail.at(-1)!.code,
  });
  expect(confirmed.status).toBe('ok');
  return confirmed.data;
}
describe('API with real PostgreSQL engine and isolated external services', () => {
  it('updates and deletes only owned rules and rejects service-domain destinations', async () => {
    const owner = new Client();
    const other = new Client();
    await owner.register();
    await other.register('two@example.com');
    const alias = await owner.call('/api/v1/email', 'POST', {
      src: 'alias@paper.test',
    });
    await destination(owner);
    const created = await owner.call('/api/v1/forward', 'POST', {
      emailId: alias.data.id,
      dest: 'dest@example.com',
      rule: [],
    });
    const ids = { emailId: alias.data.id, forwardId: created.data.id };
    expect(
      (await other.call('/api/v1/forward', 'PATCH', { ...ids, rule: [] }))
        .httpStatus,
    ).toBe(404);
    expect(
      (await other.call('/api/v1/forward', 'DELETE', ids)).httpStatus,
    ).toBe(404);
    expect(
      (
        await owner.call('/api/v1/forward', 'PATCH', {
          ...ids,
          dest: 'another@paper.test',
        })
      ).httpStatus,
    ).toBe(400);
    const rule = [{ type: 'and', postRule: { newsletter: true } }];
    expect(
      (await owner.call('/api/v1/forward', 'PATCH', { ...ids, rule }))
        .httpStatus,
    ).toBe(200);
    expect((await signed('/api/v1/router', mail)).body.data[0].matches).toBe(
      false,
    );
    expect(
      (
        await signed('/api/v1/router', {
          ...mail,
          headers: [
            {
              key: 'List-Unsubscribe',
              value: '<mailto:unsubscribe@example.com>',
            },
          ],
        })
      ).body.data[0].matches,
    ).toBe(true);
    expect(
      (await owner.call('/api/v1/forward', 'DELETE', ids)).httpStatus,
    ).toBe(200);
    expect((await signed('/api/v1/router', mail)).body.data).toEqual([]);
  });
  it('allows only one concurrent refresh using the same persisted token', async () => {
    const c = new Client();
    await c.register();
    const cookie = [...c.cookies]
      .map(([key, value]) => key + '=' + value)
      .join('; ');
    const refresh = () =>
      fetch(base + '/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          cookie,
          'x-paperplane-csrf': c.csrf,
          'content-type': 'application/json',
        },
        body: '{}',
      });
    const results = await Promise.all([refresh(), refresh()]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
  });
  it('rejects OAuth state from a different browser session', async () => {
    const a = new Client();
    const b = new Client();
    await a.call('/api/v1/auth/csrf');
    await b.call('/api/v1/auth/csrf');
    const start = await a.call('/api/v1/verify/oauth?provider=google');
    const stateValue = new URL(start.data.authorization).searchParams.get(
      'state',
    );
    expect(
      (
        await b.call('/api/v1/verify/provider', 'POST', {
          provider: 'google',
          code: 'test',
          state: stateValue,
        })
      ).httpStatus,
    ).toBe(400);
  });
  it('rejects stale internal signatures and expired refresh sessions without revoking access', async () => {
    const timestamp = String(Date.now() - 600000);
    const id = randomUUID();
    const old = await signed('/api/v1/router', mail, {
      'x-paperplane-timestamp': timestamp,
      'x-request-id': id,
      'x-paperplane-signature': generateHmac(
        [
          'POST',
          '/api/v1/router',
          id,
          timestamp,
          sha256(JSON.stringify(mail)),
        ].join('.'),
      ),
    });
    expect(old.response.status).toBe(401);
    const c = new Client();
    await c.register();
    await database.update(sessions).set({ expiresAt: new Date(0) });
    expect((await c.call('/api/v1/users/me')).httpStatus).toBe(200);
    expect((await c.call('/api/v1/auth/refresh', 'POST', {})).httpStatus).toBe(
      400,
    );
  });
  it('does not issue verification tokens when SMTP delivery fails', async () => {
    const c = new Client();
    await c.call('/api/v1/auth/csrf');
    state.failMail = true;
    const result = await c.call('/api/v1/verify/email', 'POST', {
      type: 'register',
      email: 'one@example.com',
    });
    expect(result.httpStatus).toBe(502);
    expect(result.data).toBeUndefined();
  });
  it('validates access JWT type, expiry and claims without a session claim', async () => {
    const c = new Client();
    await c.register();
    const decoded = jwt.verify(c.access);
    expect(decoded?.type).toBe('accessToken');
    expect(decoded?.claims).toEqual({ id: 1 });
    const invalid = [
      'invalid-token',
      createRefreshClaims(1),
      jwt.sign({ type: 'accessToken', claims: { id: 1 } }, -1),
      jwt.sign({ type: 'accessToken', claims: { id: 0 } }, '15 minutes'),
    ];
    for (const token of invalid) {
      const result = await c.call('/api/v1/users/me', 'GET', undefined, {
        authorization: 'Bearer ' + token,
      });
      expect(result.httpStatus).toBe(401);
      expect(result.status).toBe('failed');
    }
  });
  it('health, readiness, CSRF and unauthenticated requests', async () => {
    expect((await fetch(base + '/health')).status).toBe(200);
    expect((await fetch(base + '/ready')).status).toBe(200);
    expect((await fetch(base + '/api/v1/users/me')).status).toBe(401);
    expect(
      (
        await fetch(base + '/api/v1/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(401);
  });
  it('registers, rotates refresh only once and keeps access valid after logout', async () => {
    const c = new Client();
    await c.register();
    expect((await c.call('/api/v1/users/me')).data.email).toBe(
      'one@example.com',
    );
    const oldAccess = c.access;
    const oldRefresh = c.cookies.get('refreshToken')!;
    expect((await c.call('/api/v1/auth/refresh', 'POST', {})).status).toBe(
      'ok',
    );
    const fresh = c.cookies.get('refreshToken')!;
    expect(fresh).not.toBe(oldRefresh);
    expect(
      (
        await c.call('/api/v1/users/me', 'GET', undefined, {
          authorization: 'Bearer ' + oldAccess,
        })
      ).status,
    ).toBe('ok');
    c.cookies.set('refreshToken', oldRefresh);
    expect((await c.call('/api/v1/auth/refresh', 'POST', {})).status).toBe(
      'failed',
    );
    c.cookies.set('refreshToken', fresh);
    expect((await c.call('/api/v1/auth/logout', 'POST', {})).status).toBe('ok');
    expect((await c.call('/api/v1/users/me')).status).toBe('ok');
    await c.call('/api/v1/auth/csrf');
    expect(
      (
        await c.call('/api/v1/auth/login', 'POST', {
          email: 'one@example.com',
          password: 'password!1',
        })
      ).status,
    ).toBe('ok');
    expect((await c.call('/api/v1/users/me')).status).toBe('ok');
  });
  it('rejects signed refresh tokens without a persisted active session', async () => {
    const c = new Client();
    await c.register();
    c.cookies.set('refreshToken', createRefreshClaims(1));
    expect((await c.call('/api/v1/auth/refresh', 'POST', {})).status).toBe(
      'failed',
    );
  });
  it('rejects reserved alias names without storing them and allows non-exact matches', async () => {
    const c = new Client();
    await c.register();
    for (const name of [
      'noreply', 'no-reply', 'no_reply', 'admin', 'administrator',
      'postmaster', 'hostmaster', 'webmaster', 'abuse', 'security',
      'support', 'contact', 'info', 'billing', 'root', 'system',
      'NoReply', 'ADMIN',
    ]) {
      const result = await c.call('/api/v1/email', 'POST', {
        src: `${name}@paper.test`,
      });
      expect(result).toMatchObject({
        httpStatus: 400,
        status: 'failed',
        error: 'Reserved email address',
      });
    }
    expect((await c.call('/api/v1/email')).data.total).toBe(0);
    for (const name of ['myadmin', 'admin-team', 'noreply123']) {
      const result = await c.call('/api/v1/email', 'POST', {
        src: `${name}@paper.test`,
      });
      expect(result.httpStatus).toBe(201);
    }
    expect((await c.call('/api/v1/email')).data.total).toBe(3);
  });
  it('manages multiple aliases, validates domains and enforces ownership', async () => {
    const a = new Client();
    const b = new Client();
    await a.register();
    await b.register('two@example.com');
    const first = await a.call('/api/v1/email', 'POST', {
      src: 'alias@paper.test',
    });
    expect(first.status).toBe('ok');
    expect(
      (await a.call('/api/v1/email', 'POST', { src: 'second@paper.test' }))
        .status,
    ).toBe('ok');
    expect((await a.call('/api/v1/email?page=1')).data.total).toBe(2);
    expect((await a.call('/api/v1/email?page=-1')).status).toBe('failed');
    expect(
      (await a.call('/api/v1/email', 'POST', { src: 'bad@example.com' }))
        .status,
    ).toBe('failed');
    expect(
      (
        await b.call('/api/v1/forward', 'POST', {
          emailId: first.data.id,
          dest: 'dest@example.com',
          rule: [],
        })
      ).status,
    ).toBe('failed');
    expect(
      (await b.call('/api/v1/email', 'DELETE', { emailId: first.data.id }))
        .status,
    ).toBe('failed');
  });
  it('verifies a destination, routes matching mail and rejects tampering/replay', async () => {
    const c = new Client();
    await c.register();
    const alias = await c.call('/api/v1/email', 'POST', {
      src: 'alias@paper.test',
    });
    expect(
      (
        await c.call('/api/v1/forward', 'POST', {
          emailId: alias.data.id,
          dest: 'dest@example.com',
          rule: [],
        })
      ).status,
    ).toBe('failed');
    const dest = await destination(c);
    expect(
      (
        await c.call('/api/v1/forward', 'POST', {
          emailId: alias.data.id,
          dest: 'dest@example.com',
          rule: [],
        })
      ).status,
    ).toBe('ok');
    const routed = await signed('/api/v1/router', mail);
    expect(routed.response.status).toBe(200);
    expect(routed.body.data[0].matches).toBe(true);
    const replay = await fetch(base + '/api/v1/router', {
      method: 'POST',
      headers: routed.headers,
      body: JSON.stringify(mail),
    });
    expect(replay.status).toBe(409);
    const tampered = await fetch(base + '/api/v1/router', {
      method: 'POST',
      headers: routed.headers,
      body: JSON.stringify({ ...mail, subject: 'changed' }),
    });
    expect(tampered.status).toBe(401);
    const trial = await c.call('/api/v1/forward/test', 'POST', {
      rule: [
        {
          type: 'and',
          postRule: {
            newsletter: 'all',
            subject: {
              type: 'and',
              regexp: [{ type: 'prefix', value: 'invoice' }],
            },
          },
        },
      ],
      mail,
    });
    expect(trial.data.matches).toBe(true);
    await c.call('/api/v1/destinations', 'DELETE', { destinationId: dest.id });
    expect((await signed('/api/v1/router', mail)).body.data).toEqual([]);
  });
  it('stores delivery events idempotently and isolates histories', async () => {
    const c = new Client();
    await c.register();
    const a = await c.call('/api/v1/email', 'POST', {
      src: 'alias@paper.test',
    });
    await destination(c);
    await c.call('/api/v1/forward', 'POST', {
      emailId: a.data.id,
      dest: 'dest@example.com',
      rule: [],
    });
    const event = {
      eventId: randomUUID(),
      source: 'alias@paper.test',
      destination: 'dest@example.com',
      messageId: 'mail-1',
      status: 'sent',
    };
    expect(
      (await signed('/api/v1/internal/deliveries', event)).response.status,
    ).toBe(201);
    expect(
      (await signed('/api/v1/internal/deliveries', event)).response.status,
    ).toBe(200);
    expect(
      (
        await signed('/api/v1/internal/deliveries', {
          ...event,
          status: 'failed',
        })
      ).response.status,
    ).toBe(409);
    expect((await c.call('/api/v1/deliveries')).data.total).toBe(1);
    const other = new Client();
    await other.register('two@example.com');
    expect((await other.call('/api/v1/deliveries')).data.total).toBe(0);
    await c.call('/api/v1/email', 'DELETE', { emailId: a.data.id });
    expect((await c.call('/api/v1/deliveries')).data.total).toBe(0);
  });
  it('rejects mismatched social identity and consumes OAuth state once', async () => {
    const c = new Client();
    await c.call('/api/v1/auth/csrf');
    const start = await c.call('/api/v1/verify/oauth?provider=google');
    const stateValue = new URL(start.data.authorization).searchParams.get(
      'state',
    );
    const body = { provider: 'google', code: 'test', state: stateValue };
    const verified = await c.call('/api/v1/verify/provider', 'POST', body);
    expect(verified.status).toBe('ok');
    expect((await c.call('/api/v1/verify/provider', 'POST', body)).status).toBe(
      'failed',
    );
    const headers = { 'x-paperplane-verify': verified.data.verifyToken };
    expect(
      (
        await c.call(
          '/api/v1/auth/register',
          'POST',
          { provider: 'google', providerId: 'other', name: '테스터' },
          headers,
        )
      ).status,
    ).toBe('failed');
    expect(
      (
        await c.call(
          '/api/v1/auth/register',
          'POST',
          { provider: 'google', providerId: 'google-person', name: '테스터' },
          headers,
        )
      ).status,
    ).toBe('ok');
  });
  it('resets a password and revokes previous sessions', async () => {
    const c = new Client();
    await c.register();
    state.cache.delete('email:one@example.com');
    const v = await c.call('/api/v1/verify/email', 'POST', {
      type: 'password',
      email: 'one@example.com',
    });
    const headers = { 'x-paperplane-verify': v.data.verifyToken };
    await c.call(
      '/api/v1/verify/code',
      'POST',
      { code: state.mail.at(-1)!.code },
      headers,
    );
    expect(
      (
        await c.call(
          '/api/v1/auth/password/reset',
          'POST',
          { password: 'newpassword!1', passwordConfirm: 'newpassword!1' },
          headers,
        )
      ).status,
    ).toBe('ok');
    expect((await c.call('/api/v1/users/me')).status).toBe('ok');
    expect((await c.call('/api/v1/auth/refresh', 'POST', {})).status).toBe(
      'failed',
    );
    expect(
      (
        await c.call('/api/v1/auth/login', 'POST', {
          email: 'one@example.com',
          password: 'password!1',
        })
      ).status,
    ).toBe('failed');
    expect(
      (
        await c.call('/api/v1/auth/login', 'POST', {
          email: 'one@example.com',
          password: 'newpassword!1',
        })
      ).status,
    ).toBe('ok');
  });
  it('updates and deletes an account with cascading cleanup', async () => {
    const c = new Client();
    await c.register();
    await c.call('/api/v1/email', 'POST', { src: 'alias@paper.test' });
    await destination(c);
    expect(
      (await c.call('/api/v1/users/me', 'PATCH', { name: '새이름' })).data.name,
    ).toBe('새이름');
    expect(
      (await c.call('/api/v1/users/me', 'DELETE', { confirm: true })).status,
    ).toBe('ok');
    expect(await database.select().from(users)).toEqual([]);
    expect(await database.select().from(sessions)).toEqual([]);
  });
  it('fails closed on bad codes and limits repeated verification attempts', async () => {
    const c = new Client();
    await c.call('/api/v1/auth/csrf');
    const v = await c.call('/api/v1/verify/email', 'POST', {
      type: 'register',
      email: 'one@example.com',
    });
    const headers = { 'x-paperplane-verify': v.data.verifyToken };
    for (let i = 0; i < 6; i++)
      expect(
        (
          await c.call(
            '/api/v1/verify/code',
            'POST',
            {
              code: state.mail.at(-1)!.code === '000000' ? '111111' : '000000',
            },
            headers,
          )
        ).status,
      ).toBe('failed');
    expect(
      (
        await c.call(
          '/api/v1/verify/code',
          'POST',
          { code: state.mail.at(-1)!.code },
          headers,
        )
      ).status,
    ).toBe('failed');
  });
});
