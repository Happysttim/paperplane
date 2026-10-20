import { useRef, useState } from 'react';

/** 변경 요청의 중복 제출을 막고 입력을 유지한 채 실패를 전달합니다. */
export function useAction() {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();
  /** 사용자가 선택한 변경 작업을 한 번 실행합니다. */
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(undefined);
    try {
      await action();
    } catch (reason) {
      setError(reason);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return { pending, error, run, clearError: () => setError(undefined) };
}
