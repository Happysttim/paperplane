import { z } from 'zod';
import { request, setTokens } from './client';
import {
  challengeSchema,
  deliveryPageSchema,
  destinationSchema,
  domainSchema,
  emailPageSchema,
  emailSchema,
  forwardSchema,
  testResultSchema,
  tokensSchema,
  userSchema,
  verifyTokenSchema,
  type Mail,
  type Rule,
} from './models';

/** 서버 페이지 번호를 유지하며 주소와 규칙을 조회합니다. */
export function getEmails(page: number) {
  return request(`/email?page=${page}`, emailPageSchema);
}
/** 생성 가능한 도메인 목록을 조회합니다. */
export function getDomains() {
  return request('/domains', z.array(domainSchema));
}
/** 인증된 받는 메일함 전체 목록을 조회합니다. */
export function getDestinations() {
  return request('/destinations', z.array(destinationSchema));
}
/** 로그인 사용자 정보를 조회합니다. */
export function getMe() {
  return request('/users/me', userSchema);
}
/** 전달 이벤트를 서버의 20개 단위 페이지로 조회합니다. */
export function getDeliveries(page: number) {
  return request(`/deliveries?page=${page}`, deliveryPageSchema);
}
/** 주소를 서버에 생성합니다. 중복 요청은 자동 재시도하지 않습니다. */
export function createEmail(src: string) {
  return request('/email', emailSchema, { method: 'POST', body: { src } });
}
/** 주소와 연결된 규칙·기록을 삭제합니다. */
export function deleteEmail(emailId: number) {
  return request('/email', z.undefined(), {
    method: 'DELETE',
    body: { emailId },
  });
}
/** 전달 설정 하나를 생성하거나 변경합니다. */
export function saveForward(body: {
  emailId: number;
  dest: string;
  rule: Rule;
  forwardId?: number;
}) {
  return request('/forward', forwardSchema, {
    method: body.forwardId ? 'PATCH' : 'POST',
    body,
  });
}
/** 선택한 전달 설정 하나를 삭제합니다. */
export function deleteForward(emailId: number, forwardId: number) {
  return request('/forward', z.undefined(), {
    method: 'DELETE',
    body: { emailId, forwardId },
  });
}
/** 샘플 메일로 서버 조건 판정만 요청합니다. 실제 메일은 발송하지 않습니다. */
export function testForward(rule: Rule, mail: Mail) {
  return request('/forward/test', testResultSchema, {
    method: 'POST',
    body: { rule, mail },
  });
}
/** 목적지 인증 코드를 발송하고 일회용 challenge를 받습니다. */
export function requestDestination(address: string) {
  return request('/destinations/verify', challengeSchema, {
    method: 'POST',
    body: { address },
  });
}
/** 목적지 인증 challenge를 한 번 소비합니다. */
export function confirmDestination(verificationToken: string, code: string) {
  return request('/destinations/confirm', destinationSchema, {
    method: 'POST',
    body: { verificationToken, code },
  });
}
/** 목적지와 해당 목적지에 연결된 본인 규칙을 삭제합니다. */
export function deleteDestination(destinationId: number) {
  return request('/destinations', z.undefined(), {
    method: 'DELETE',
    body: { destinationId },
  });
}
/** 이름을 저장하고 서버의 갱신된 사용자 정보를 받습니다. */
export function updateName(name: string) {
  return request('/users/me', userSchema, { method: 'PATCH', body: { name } });
}
/** 확인한 사용자 계정과 연결 데이터를 삭제합니다. */
export function deleteAccount() {
  return request('/users/me', z.undefined(), {
    method: 'DELETE',
    body: { confirm: true },
  });
}
/** Refresh 세션 폐기와 쿠키 삭제를 서버에 요청합니다. */
export function logout() {
  return request('/auth/logout', z.undefined(), {
    method: 'POST',
    public: true,
  });
}
/** 이메일 로그인 후 새 access/CSRF 토큰을 메모리에 반영합니다. */
export async function login(email: string, password: string) {
  const tokens = await request('/auth/login', tokensSchema, {
    method: 'POST',
    public: true,
    body: { email, password },
  });
  setTokens(tokens);
  return getMe();
}
/** 가입 또는 비밀번호 복구용 인증 메일을 요청합니다. */
export function requestVerification(
  email: string,
  type: 'register' | 'password',
) {
  return request('/verify/email', verifyTokenSchema, {
    method: 'POST',
    public: true,
    body: { email, type },
  });
}
/** 가입·비밀번호 복구 코드를 검증합니다. */
export function verifyCode(verifyToken: string, code: string) {
  return request('/verify/code', z.undefined(), {
    method: 'POST',
    public: true,
    verifyToken,
    body: { code },
  });
}
export type Registration =
  | {
      provider: 'local';
      email: string;
      name: string;
      password: string;
      passwordConfirm: string;
    }
  | { provider: 'google' | 'naver'; providerId: string; name: string };
/** 인증을 마친 가입 정보를 전송하고 로그인 상태를 준비합니다. */
export async function register(body: Registration, verifyToken: string) {
  const tokens = await request('/auth/register', tokensSchema, {
    method: 'POST',
    public: true,
    verifyToken,
    body,
  });
  setTokens(tokens);
  return getMe();
}
/** 비밀번호를 재설정합니다. 성공 후 UI에서 인증·조회 캐시를 비웁니다. */
export function resetPassword(
  password: string,
  passwordConfirm: string,
  verifyToken: string,
) {
  return request('/auth/password/reset', z.undefined(), {
    method: 'POST',
    public: true,
    verifyToken,
    body: { password, passwordConfirm },
  });
}
