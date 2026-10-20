import { useSyncExternalStore } from 'react';

type Verification = {
  type: 'register' | 'password';
  email: string;
  token: string;
  verified: boolean;
  expiresAt: number;
  resendAt: number;
};
type Social = {
  provider: 'google' | 'naver';
  providerId: string;
  verifyToken: string;
};
let verification: Verification | undefined;
let social: Social | undefined;
const listeners = new Set<() => void>();
/** 인증 흐름의 메모리 변경을 구독합니다. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
/** 인증 JWT를 저장소나 URL에 남기지 않고 현재 가입 단계에만 보관합니다. */
export function setVerification(value: Verification | undefined) {
  verification = value;
  listeners.forEach((listener) => listener());
}
/** 인증 단계의 유실·변경을 React에서 확인합니다. */
export function useVerification() {
  return useSyncExternalStore(subscribe, () => verification);
}
/** 소셜 신규 가입용 검증 결과만 메모리에 보관합니다. */
export function setSocial(value: Social | undefined) {
  social = value;
}
/** 소셜 가입 화면에서 아직 유효한 흐름을 읽습니다. */
export function getSocial() {
  return social;
}
