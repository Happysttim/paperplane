import { z } from 'zod';

export const demoMode =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('demo') === '1';
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(
  /\/$/,
  '',
);
const envelope = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), data: z.unknown().optional() }),
  z.object({ status: z.literal('failed'), error: z.string().optional() }),
]);
let accessToken: string | undefined;
let csrfToken: string | undefined;
let csrfFlight: Promise<string> | undefined;
let refreshFlight: Promise<void> | undefined;
let generation = 0;

/** HTTP 오류와 서버의 재요청 대기 시간을 보관합니다. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter = 0,
  ) {
    super(message);
  }
}

/** 인증 토큰은 메모리에서만 교체합니다. */
export function setTokens(tokens: { accessToken: string; csrfToken?: string }) {
  accessToken = tokens.accessToken;
  if (tokens.csrfToken) csrfToken = tokens.csrfToken;
}
/** 로그아웃 시 진행 중 응답이 이전 세션을 복원하지 못하게 합니다. */
export function clearTokens() {
  generation++;
  accessToken = undefined;
  csrfToken = undefined;
}
/** OAuth 왕복 중 보관한 nonce를 기존 쿠키와 함께 사용합니다. */
export function restoreCsrf(token: string) {
  csrfToken = token;
}

/** 실제 API 또는 명시적으로 선택한 개발 전용 메모리 서버를 호출합니다. */
async function transport(path: string, init: RequestInit): Promise<Response> {
  if (demoMode) return (await import('@/demo/server')).demoFetch(path, init);
  try {
    return await fetch(baseUrl + path, { ...init, credentials: 'include' });
  } catch {
    throw new ApiError(
      0,
      '연결을 확인한 뒤 다시 시도해 주세요. 요청 결과는 목록에서 확인할 수 있어요.',
    );
  }
}

/** 신뢰하지 않는 JSON 응답을 공통 응답 구조와 데이터 스키마로 검증합니다. */
async function decode<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const raw: unknown = await response.json().catch(() => undefined);
  const parsed = envelope.safeParse(raw);
  const retry = Number(response.headers.get('Retry-After') || 0);
  if (!response.ok || !parsed.success || parsed.data.status === 'failed') {
    throw new ApiError(
      response.status,
      parsed.success && parsed.data.status === 'failed'
        ? parsed.data.error || '요청에 실패했어요.'
        : '서버 응답을 확인할 수 없어요.',
      retry,
    );
  }
  const data = schema.safeParse(parsed.data.data);
  if (!data.success)
    throw new ApiError(
      502,
      '서버 응답 형식이 예상과 달라요. 잠시 후 다시 확인해 주세요.',
    );
  return data.data;
}

/** 병렬 쓰기 요청이 CSRF 쿠키를 여러 번 바꾸지 않도록 한 요청을 공유합니다. */
export async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  const version = generation;
  csrfFlight ??= transport('/auth/csrf', { method: 'GET' })
    .then((response) => decode(response, z.object({ csrfToken: z.string() })))
    .then((tokens) => {
      if (version !== generation) throw new ApiError(401, 'Session changed');
      csrfToken = tokens.csrfToken;
      return tokens.csrfToken;
    })
    .finally(() => {
      csrfFlight = undefined;
    });
  return csrfFlight;
}

/** 동시 토큰 갱신은 한 번만 수행하고 갱신 실패는 호출자에게 전달합니다. */
export async function refreshSession(): Promise<void> {
  if (refreshFlight) return refreshFlight;
  const version = generation;
  refreshFlight = (async () => {
    const csrf = await ensureCsrf();
    const response = await transport('/auth/refresh', {
      method: 'POST',
      headers: { 'x-paperplane-csrf': csrf },
    });
    const tokens = await decode(
      response,
      z.object({ accessToken: z.string() }),
    );
    if (generation !== version) throw new ApiError(401, 'Session changed');
    setTokens(tokens);
  })().finally(() => {
    refreshFlight = undefined;
  });
  return refreshFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  public?: boolean;
  verifyToken?: string;
  csrf?: boolean;
  signal?: AbortSignal;
}

/** 명세의 인증·CSRF 헤더를 붙이고 인증 실패만 최대 한 번 갱신합니다. */
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const version = generation;
  const protectedRequest = !options.public;
  if (protectedRequest && !accessToken) await refreshSession();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' || options.csrf)
    headers['x-paperplane-csrf'] = await ensureCsrf();
  if (options.verifyToken) headers['x-paperplane-verify'] = options.verifyToken;
  if (protectedRequest && accessToken)
    headers.Authorization = `Bearer ${accessToken}`;
  const init: RequestInit = {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  };
  if (version !== generation) throw new ApiError(401, 'Session changed');
  const sentToken = accessToken;
  let response = await transport(path, init);
  if (response.status === 401 && protectedRequest) {
    if (version !== generation) throw new ApiError(401, 'Session changed');
    if (accessToken === sentToken) await refreshSession();
    headers.Authorization = `Bearer ${accessToken ?? ''}`;
    headers['x-paperplane-csrf'] = await ensureCsrf();
    response = await transport(path, init);
  }
  if (version !== generation) throw new ApiError(401, 'Session changed');
  return decode(response, schema);
}

/** 서버의 기술적 오류를 사용자 행동에 맞는 한국어로 표시합니다. */
export function errorMessage(error: unknown): string {
  if (error instanceof SyntaxError) return '샘플 JSON 문법을 확인해 주세요.';
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? '입력값을 확인해 주세요.';
  if (!(error instanceof ApiError))
    return '요청을 완료하지 못했어요. 다시 확인해 주세요.';
  const messages: Record<string, string> = {
    'invalid user': '이메일 또는 비밀번호를 확인해 주세요.',
    'Email already exists':
      '이미 사용 중인 주소예요. 다른 주소를 입력해 주세요.',
    'Unsupported email domain': '사용할 수 없는 도메인이에요.',
    'Invalid verification code': '인증번호를 확인해 주세요.',
    'Invalid or expired verification':
      '인증번호가 다르거나 만료됐어요. 새 코드를 받아 주세요.',
    'invalid registration request':
      '가입 인증을 다시 진행해 주세요. 입력한 이름은 유지할 수 있어요.',
  };
  const message = messages[error.message];
  if (message) return message;
  if (error.status === 401 || error.message === 'invalid refresh token')
    return '로그인이 만료됐어요. 다시 로그인해 주세요.';
  if (error.status === 429)
    return `요청이 많아요. ${error.retryAfter || 60}초 후 다시 시도해 주세요.`;
  if (error.status === 404)
    return '항목이 삭제됐거나 접근할 수 없어요. 목록에서 다시 선택해 주세요.';
  if (error.status >= 500)
    return '서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
  if (error.status === 400) return '입력 내용과 인증 상태를 확인해 주세요.';
  return error.message;
}
