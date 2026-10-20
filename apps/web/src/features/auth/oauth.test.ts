import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  window.history.replaceState(
    null,
    '',
    '/callback/oauth/google?code=example-code&state=example-state',
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

/** 제공자 왕복 중 보관할 nonce 상태를 준비합니다. */
function prepare(createdAt = Date.now()) {
  sessionStorage.setItem(
    'paperplane:oauth',
    JSON.stringify({
      provider: 'google',
      csrf: 'saved-csrf',
      state: 'example-state',
      returnTo: '/emails',
      createdAt,
    }),
  );
}

it('OAuth 콜백을 한 번 교환하고 기존 CSRF를 유지한다', async () => {
  prepare();
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        status: 'ok',
        data: { accessToken: 'access', csrfToken: 'new-csrf' },
      }),
    );
  vi.stubGlobal('fetch', fetcher);
  const { finishOAuth } = await import('./oauth');
  const first = finishOAuth('google');
  const second = finishOAuth('google');
  expect(first).toBe(second);
  await Promise.all([first, second]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/v1/verify/provider');
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    method: 'POST',
    credentials: 'include',
    headers: { 'x-paperplane-csrf': 'saved-csrf' },
  });
  expect(sessionStorage.getItem('paperplane:oauth')).toBeNull();
  expect(window.location.search).toBe('');
});
it('만료된 OAuth state는 서버로 보내지 않는다', async () => {
  prepare(Date.now() - 301000);
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const { finishOAuth } = await import('./oauth');
  await expect(finishOAuth('google')).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it('다른 provider 콜백은 거부한다', async () => {
  prepare();
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const { finishOAuth } = await import('./oauth');
  await expect(finishOAuth('naver')).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
