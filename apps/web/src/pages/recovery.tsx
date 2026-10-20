import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
/** 잘못된 경로나 예기치 못한 화면 오류에 복구 경로를 제공합니다. */
export function RecoveryPage() {
  return (
    <main id="main" tabIndex={-1} className="recovery">
      <h1>화면을 열 수 없어요.</h1>
      <p>주소를 확인하거나 시작 화면에서 다시 이동해 주세요.</p>
      <Button asChild>
        <Link to="/">시작 화면</Link>
      </Button>
    </main>
  );
}
