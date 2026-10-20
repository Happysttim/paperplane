import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 조건부 클래스와 Tailwind 충돌을 정리합니다. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 서버 시각을 브라우저의 현지 날짜와 시간으로 표시합니다. */
export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '날짜 확인 필요'
    : new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

/** 인증 후 이동을 허용한 내부 경로만 반환합니다. */
export function safeReturnTo(value: string | null, fallback = '/emails') {
  return value &&
    /^\/(emails|email|rule|destinations|deliveries|settings)(\/|\?|$)/.test(
      value,
    ) &&
    !value.includes('\\')
    ? value
    : fallback;
}
