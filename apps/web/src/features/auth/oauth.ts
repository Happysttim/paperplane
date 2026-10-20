import { z } from 'zod';
import { ensureCsrf, request, restoreCsrf, setTokens } from '@/api/client';
import { tokensSchema } from '@/api/models';
import { safeReturnTo } from '@/lib/utils';

const pendingSchema = z.object({
  provider: z.enum(['google', 'naver']),
  csrf: z.string(),
  state: z.string(),
  returnTo: z.string(),
  createdAt: z.number(),
});
const exchangeSchema = z.union([
  tokensSchema,
  z.object({ verifyToken: z.string(), providerId: z.string() }),
]);
let callbackFlight:
  | Promise<{
      result: z.infer<typeof exchangeSchema>;
      provider: 'google' | 'naver';
      returnTo: string;
    }>
  | undefined;

/** OAuth용 nonce만 탭 저장소에 보관한 뒤 신뢰한 제공자 페이지로 이동합니다. */
export async function startOAuth(
  provider: 'google' | 'naver',
  returnTo: string,
) {
  const csrf = await ensureCsrf();
  const result = await request(
    `/verify/oauth?provider=${provider}`,
    z.object({ authorization: z.string() }),
    { public: true, csrf: true },
  );
  const url = new URL(result.authorization);
  const state = url.searchParams.get('state');
  if (
    url.protocol !== 'https:' ||
    !['accounts.google.com', 'nid.naver.com'].includes(url.hostname) ||
    !state
  )
    throw new Error('Invalid OAuth URL');
  sessionStorage.setItem(
    'paperplane:oauth',
    JSON.stringify({
      provider,
      csrf,
      state,
      returnTo: safeReturnTo(returnTo),
      createdAt: Date.now(),
    }),
  );
  window.location.assign(url.href);
}

/** StrictMode 재실행에도 OAuth code는 한 번만 교환합니다. */
export function finishOAuth(provider: string | undefined) {
  callbackFlight ??= (async () => {
    const params = new URLSearchParams(window.location.search);
    const saved = sessionStorage.getItem('paperplane:oauth');
    sessionStorage.removeItem('paperplane:oauth');
    window.history.replaceState(null, '', window.location.pathname);
    if (!saved) throw new Error('소셜 로그인을 다시 시작해 주세요.');
    const pending = pendingSchema.parse(JSON.parse(saved));
    if (
      pending.provider !== provider ||
      params.get('state') !== pending.state ||
      Date.now() - pending.createdAt > 300_000 ||
      params.has('error')
    )
      throw new Error('소셜 로그인이 취소됐거나 인증이 만료됐어요.');
    const code = params.get('code');
    if (!code) throw new Error('인증 코드를 확인할 수 없어요.');
    restoreCsrf(pending.csrf);
    const result = await request('/verify/provider', exchangeSchema, {
      method: 'POST',
      public: true,
      body: { provider, code, state: pending.state },
    });
    if ('accessToken' in result) setTokens(result);
    return {
      result,
      provider: pending.provider,
      returnTo: safeReturnTo(pending.returnTo),
    };
  })();
  return callbackFlight;
}
