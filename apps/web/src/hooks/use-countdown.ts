import { useEffect, useState } from 'react';

/** 백그라운드 탭에서도 실제 마감 시각을 기준으로 남은 시간을 계산합니다. */
export function useCountdown(deadline: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
