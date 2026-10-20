import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { ArrowUpRight, Inbox, Mail, Send, Settings } from 'lucide-react';
import { useSession } from '@/hooks/queries';
import { ApiError, clearTokens, demoMode } from '@/api/client';
import { ErrorNotice, LoadingState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { clearPrivateData } from './query-client';
import { clearRuleDrafts } from '@/features/rules/drafts';
import { setSocial, setVerification } from '@/features/auth/flow';

/** 서비스의 공용 로고와 이름을 표시합니다. */
export function Brand() {
  return (
    <Link className="brand" to="/">
      <img src="/icon.png" width="36" height="36" alt="" />
      <span>Paperplane</span>
    </Link>
  );
}
/** 공개·보호 화면의 라우트 이동 시 제목과 초점 위치를 정리합니다. */
export function RootLayout() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [location.pathname]);
  useEffect(() => {
    /** 다른 탭의 로그아웃 알림에는 토큰 없이 메모리와 캐시만 정리합니다. */
    function receive(event: StorageEvent) {
      if (event.key === 'paperplane:logout') {
        clearTokens();
        clearRuleDrafts();
        setSocial(undefined);
        setVerification(undefined);
        void clearPrivateData();
      }
    }
    window.addEventListener('storage', receive);
    return () => window.removeEventListener('storage', receive);
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      {demoMode && (
        <div className="demo-banner">
          디자인 미리보기 · 예시 데이터 · 실제 메일은 보내지 않습니다 · 인증
          코드 123456
        </div>
      )}
      <Outlet />
    </>
  );
}
/** API 세션 복구가 끝난 뒤에만 사용자 데이터를 렌더링합니다. */
export function ProtectedLayout() {
  const session = useSession();
  const location = useLocation();
  if (session.isPending)
    return (
      <main id="main" tabIndex={-1} className="recovery">
        <LoadingState />
      </main>
    );
  if (session.error) {
    if (
      session.error instanceof ApiError &&
      [400, 401, 404].includes(session.error.status)
    )
      return (
        <Navigate
          replace
          to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        />
      );
    return (
      <main id="main" tabIndex={-1} className="recovery">
        <h1>연결을 다시 확인해 주세요</h1>
        <ErrorNotice
          error={session.error}
          retry={() => {
            void session.refetch();
          }}
        />
        <Button asChild variant="outline">
          <Link to="/login">로그인으로 이동</Link>
        </Button>
      </main>
    );
  }
  const editing = /^\/(email\/|rule\/|emails\/new|destinations\/new)/.test(
    location.pathname,
  );
  const links = [
    { to: '/emails', label: '내 이메일', icon: Mail },
    { to: '/destinations', label: '받는 메일함', icon: Inbox },
    { to: '/deliveries', label: '전달 기록', icon: Send },
  ];
  return (
    <div className={`workspace ${editing ? 'editing' : ''}`}>
      <aside className="sidebar">
        <Brand />
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="주 메뉴">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            나만의 주소로,
            <br />
            필요한 메일만 가볍게.
          </p>
          <NavLink to="/settings" className="nav-link">
            <Settings size={18} />
            계정 설정
          </NavLink>
          <div className="user-card">
            <span className="avatar">{session.data.name.slice(0, 1)}</span>
            <div>
              <strong>{session.data.name}</strong>
              <small>
                {session.data.provider === 'local'
                  ? session.data.email
                  : `${session.data.provider} 계정`}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <Brand />
          <nav aria-label="태블릿 메뉴">
            {links.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/settings" className="avatar" aria-label="계정 설정">
            {session.data.name.slice(0, 1)}
          </Link>
        </header>
        <main id="main" tabIndex={-1} className="workspace-main">
          <div className="breadcrumb">
            워크스페이스 <ArrowUpRight size={12} />{' '}
            {links.find((item) => location.pathname.startsWith(item.to))
              ?.label ?? '전달 설정'}
          </div>
          <Outlet />
          <footer className="app-footer">
            Paperplane{' '}
            <span>새 주소로 받고, 원하는 메일함으로 전달하세요.</span>
          </footer>
        </main>
        <nav className="bottom-nav" aria-label="모바일 메뉴">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
/** 인증 화면의 브랜드 설명과 실제 폼을 두 영역으로 배치합니다. */
export function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">A LITTLE SPACE FOR YOUR MAIL</span>
          <h2>
            메일이 도착할 곳을,
            <br />
            간단하게 정하세요.
          </h2>
          <p>
            용도에 맞는 주소를 만들고
            <br />
            익숙한 메일함에서 받아 보세요.
          </p>
          <div className="auth-route">
            나만의 주소 <span>→</span> 원하는 메일함
          </div>
        </div>
        <small>필요한 메일에 더 가까이, Paperplane.</small>
      </aside>
      <main id="main" tabIndex={-1} className="auth-main">
        <div className="auth-box">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
