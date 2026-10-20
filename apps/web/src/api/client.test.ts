import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

/** 테스트 서버 응답을 실제 공통 envelope로 만듭니다. */
function ok(data?: unknown) {
  return Response.json({ status: 'ok', data });
}
beforeEach(() => {
  vi.resetModules();
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API 인증과 재시도', () => {
  it('동시 조회가 하나의 CSRF·refresh 요청을 공유한다', async () => {
    const fetcher =
      vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
    fetcher.mockImplementation((url) =>
      Promise.resolve(
        url.endsWith('/auth/csrf')
          ? ok({ csrfToken: 'csrf' })
          : url.endsWith('/auth/refresh')
            ? ok({ accessToken: 'access' })
            : ok({ id: 1 }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    const { request } = await import('./client');
    await Promise.all([
      request('/one', z.object({ id: z.number() })),
      request('/two', z.object({ id: z.number() })),
    ]);
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith('/auth/csrf')),
    ).toHaveLength(1);
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith('/auth/refresh')),
    ).toHaveLength(1);
    expect(
      fetcher.mock.calls.find(([url]) => url.endsWith('/one'))?.[1],
    ).toMatchObject({
      credentials: 'include',
      headers: { Authorization: 'Bearer access' },
    });
  });
  it('변경 요청의 500 오류는 자동 재전송하지 않는다', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { status: 'failed', error: 'Unavailable' },
          { status: 500 },
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    const { request, setTokens } = await import('./client');
    setTokens({ accessToken: 'access', csrfToken: 'csrf' });
    await expect(
      request('/email', z.unknown(), {
        method: 'POST',
        body: { src: 'a@example.com' },
      }),
    ).rejects.toMatchObject({ status: 500 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'include',
      headers: { 'x-paperplane-csrf': 'csrf' },
    });
  });
  it('401 응답만 한 번 갱신하고 무한 반복하지 않는다', async () => {
    const fetcher = vi
      .fn<(url: string) => Promise<Response>>()
      .mockImplementation((url) =>
        Promise.resolve(
          url.endsWith('/auth/refresh')
            ? ok({ accessToken: 'new' })
            : Response.json({ status: 'failed' }, { status: 401 }),
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    const { request, setTokens } = await import('./client');
    setTokens({ accessToken: 'old', csrfToken: 'csrf' });
    await expect(request('/email', z.unknown())).rejects.toMatchObject({
      status: 401,
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('로그아웃 도중 도착한 refresh 응답을 적용하지 않는다', async () => {
    let finish: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const { refreshSession, clearTokens, restoreCsrf } =
      await import('./client');
    restoreCsrf('csrf');
    const pending = refreshSession();
    await Promise.resolve();
    clearTokens();
    finish?.(ok({ accessToken: 'stale' }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
  });
  it('서버 성공 응답도 명세와 다르면 거절한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ id: 'wrong' })));
    const { request, setTokens } = await import('./client');
    setTokens({ accessToken: 'access' });
    await expect(
      request('/users/me', z.object({ id: z.number() })),
    ).rejects.toMatchObject({ status: 502 });
  });
});
