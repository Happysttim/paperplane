import { ArrowDown, ArrowRight, Check, Mail, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brand } from '@/app/layout';
import { useSession } from '@/hooks/queries';

/** 실제 서비스의 주소 생성·목적지 연결 흐름을 소개합니다. */
export function LandingPage() {
  const session = useSession();
  const signedIn = session.isSuccess;
  return (
    <div className="landing">
      <header className="public-header">
        <Brand />
        {session.isPending ? (
          <Button variant="ghost" disabled>로그인 확인 중…</Button>
        ) : (
          <Button variant="ghost" asChild>
            <Link to={signedIn ? '/emails' : '/login'}>
              {signedIn ? '내 이메일' : '로그인'} <ArrowRight />
            </Link>
          </Button>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero">
          <div>
            <span className="eyebrow">YOUR MAIL, YOUR WAY</span>
            <h1>
              새 이메일 주소로 받고,
              <br />
              <em>원하는 메일함으로</em>
              <br />
              전달하세요.
            </h1>
            <p>
              쇼핑, 업무, 뉴스레터까지.
              <br />
              주소는 나누고, 메일은 익숙한 곳에서 받아 보세요.
            </p>
            <div className="flex flex-wrap gap-3">
              {session.isPending ? (
                <Button size="lg" disabled>로그인 확인 중…</Button>
              ) : (
                <Button size="lg" asChild>
                  <Link to={signedIn ? '/emails/new' : '/login?returnTo=%2Femails%2Fnew'}>
                    나만의 주소 만들기 <ArrowRight />
                  </Link>
                </Button>
              )}
              {import.meta.env.DEV && (
                <Button size="lg" variant="outline" asChild>
                  <a href="/emails?demo=1">디자인 미리보기</a>
                </Button>
              )}
            </div>
            <small>복잡한 설정 없이, 필요한 메일만 간결하게.</small>
          </div>
          <div className="hero-visual">
            <img className="hero-plane" src="/icon.png" alt="" />
            <div className="preview-mail">
              <span className="icon-tile">
                <Send />
              </span>
              <small>나만의 이메일</small>
              <strong>work@paperplane.example</strong>
              <span className="preview-tag">업무용 주소 예시</span>
            </div>
            <ArrowDown className="mx-auto my-6 text-muted-foreground" />
            <div className="preview-mail">
              <span className="icon-tile">
                <Mail />
              </span>
              <small>익숙한 메일함으로</small>
              <strong>hello@example.com</strong>
              <span className="text-sm text-emerald-800">
                <Check size={14} className="inline" /> 필요한 메일만 전달
              </span>
            </div>
          </div>
        </section>
        <section className="landing-steps">
          {[
            ['01', '주소 만들기', '용도에 맞는 나만의 이메일 주소를 만드세요.'],
            ['02', '메일함 연결', '기존에 쓰던 메일함을 인증해 연결하세요.'],
            [
              '03',
              '전달 조건 설정',
              '모든 메일 또는 원하는 조건을 선택하세요.',
            ],
          ].map(([number, title, copy]) => (
            <article key={number}>
              <span className="step-number">{number}</span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </section>
        <details className="panel mb-10">
          <summary>전달 설정은 어떻게 사용하나요?</summary>
          <p className="mt-4 text-muted-foreground">
            모든 메일을 하나의 메일함으로 보내거나, 제목에 ‘영수증’이 포함된
            메일만 골라 전달하도록 설정할 수 있어요. 설정 저장과 실제 메일 전송
            결과는 구분해서 확인할 수 있습니다.
          </p>
        </details>
      </main>
      <footer className="app-footer">
        Paperplane <span>나에게 맞는 메일의 도착지.</span>
      </footer>
    </div>
  );
}
