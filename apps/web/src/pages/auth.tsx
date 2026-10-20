import { useEffect, useState, type FormEvent } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { z } from 'zod';
import * as api from '@/api/endpoints';
import { ApiError, clearTokens } from '@/api/client';
import { emailInput, nameInput, passwordInput } from '@/api/models';
import { useAction } from '@/hooks/use-action';
import { useCountdown } from '@/hooks/use-countdown';
import {
  BackLink,
  ErrorNotice,
  Field,
  PasswordField,
  SubmitButton,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clearPrivateData, queryClient } from '@/app/query-client';
import { safeReturnTo } from '@/lib/utils';
import {
  getSocial,
  setSocial,
  setVerification,
  useVerification,
} from '@/features/auth/flow';
import { finishOAuth, startOAuth } from '@/features/auth/oauth';

/** 로그인과 회원가입에서 동일한 소셜 인증 동작을 제공합니다. */
function SocialButtons({ returnTo }: { returnTo: string }) {
  const action = useAction();
  return (
    <>
      <div className="social-buttons">
        <Button
          variant="outline"
          disabled={action.pending}
          onClick={() => action.run(() => startOAuth('google', returnTo))}
        >
          <span className="font-bold">G</span> Google로 계속하기
        </Button>
        <Button
          variant="outline"
          disabled={action.pending}
          onClick={() => action.run(() => startOAuth('naver', returnTo))}
        >
          <span className="font-bold text-green-700">N</span> 네이버로 계속하기
        </Button>
      </div>
      <ErrorNotice error={action.error} />
    </>
  );
}
/** 이메일 로그인 성공 후 이전 보호 경로로 돌아갑니다. */
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const action = useAction();
  const returnTo = safeReturnTo(search.get('returnTo'));
  /** 폼 검증 후 로그인과 사용자 캐시 교체를 완료합니다. */
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      emailInput.parse(email);
      passwordInput.parse(password);
      const user = await api.login(email, password);
      await clearPrivateData();
      queryClient.setQueryData(['session'], user);
      void navigate(returnTo, { replace: true });
    });
  }
  return (
    <>
      <span className="eyebrow">WELCOME BACK</span>
      <h1>다시 만나 반가워요.</h1>
      <p className="intro">나만의 이메일 공간으로 돌아오세요.</p>
      {search.has('reset') && (
        <p role="status" className="info-banner">
          비밀번호를 변경했어요. 다시 로그인해 주세요.
        </p>
      )}
      <SocialButtons returnTo={returnTo} />
      <div className="divider">또는 이메일로 로그인</div>
      <form onSubmit={submit}>
        <fieldset disabled={action.pending}>
          <Field label="이메일" id="login-email">
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              maxLength={254}
              required
              onChange={(event) => setEmail(event.target.value)}
              placeholder="hello@example.com"
            />
          </Field>
          <PasswordField
            id="login-password"
            label="비밀번호"
            autoComplete="current-password"
            value={password}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
          <Link className="form-link" to="/password/reset">
            비밀번호를 잊으셨나요?
          </Link>
          <ErrorNotice error={action.error} />
          <SubmitButton className="w-full" pending={action.pending}>
            로그인
          </SubmitButton>
        </fieldset>
      </form>
      <p className="auth-footer">
        처음 오셨나요? <Link to="/signup">회원가입</Link>
      </p>
    </>
  );
}
/** 가입·비밀번호 복구에서 인증 메일 요청 폼을 재사용합니다. */
export function VerificationStartPage({
  kind,
}: {
  kind: 'register' | 'password';
}) {
  const [email, setEmail] = useState('');
  const [deadline, setDeadline] = useState(0);
  const remaining = useCountdown(deadline);
  const action = useAction();
  const navigate = useNavigate();
  /** 인증 메일 발송 성공 시에만 다음 단계와 타이머를 준비합니다. */
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      const address = emailInput.parse(email);
      try {
        const result = await api.requestVerification(address, kind);
        setVerification({
          type: kind,
          email: address,
          token: result.verifyToken,
          verified: false,
          expiresAt: Date.now() + 1_800_000,
          resendAt: Date.now() + 30_000,
        });
        void navigate(
          kind === 'register' ? '/signup/verify' : '/password/reset/verify',
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 429)
          setDeadline(Date.now() + (error.retryAfter || 30) * 1000);
        throw error;
      }
    });
  }
  return (
    <>
      <BackLink to="/login">로그인</BackLink>
      <span className="eyebrow">
        {kind === 'register' ? 'STEP 01 / 03' : 'ACCOUNT RECOVERY'}
      </span>
      <h1>
        {kind === 'register'
          ? '이메일로 시작하세요.'
          : '비밀번호를 잊으셨나요?'}
      </h1>
      <p className="intro">
        {kind === 'register'
          ? '로그인에 사용할 이메일을 먼저 확인할게요.'
          : '가입한 이메일로 인증 코드를 보내드릴게요.'}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={action.pending}>
          <Field label="이메일" id="verify-email">
            <Input
              id="verify-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              required
              onChange={(event) => setEmail(event.target.value)}
              placeholder="hello@example.com"
            />
          </Field>
          <ErrorNotice error={action.error} />
          <SubmitButton
            pending={action.pending}
            disabled={remaining > 0}
            className="w-full"
          >
            {remaining ? `${remaining}초 후 다시 요청` : '인증 코드 받기'}
          </SubmitButton>
        </fieldset>
      </form>
      {kind === 'register' && (
        <>
          <div className="divider">또는 소셜 계정으로</div>
          <SocialButtons returnTo="/emails" />
        </>
      )}
    </>
  );
}
/** 가입·복구 코드 확인과 재발송 정책을 동일한 폼으로 처리합니다. */
export function VerifyCodePage({ kind }: { kind: 'register' | 'password' }) {
  const flow = useVerification();
  const [code, setCode] = useState('');
  const [attemptsBlocked, setAttemptsBlocked] = useState(false);
  const action = useAction();
  const navigate = useNavigate();
  const remaining = useCountdown(flow?.resendAt ?? 0);
  const expiry = useCountdown(flow?.expiresAt ?? 0);
  const start = kind === 'register' ? '/signup' : '/password/reset';
  if (!flow || flow.type !== kind) return <Navigate to={start} replace />;
  /** 코드 확인은 명시적 제출로만 진행합니다. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!flow) return;
    void action.run(async () => {
      z.string()
        .regex(/^\d{6}$/, '인증 코드 6자리를 입력해 주세요.')
        .parse(code);
      try {
        await api.verifyCode(flow.token, code);
        setVerification({ ...flow, verified: true });
        void navigate(
          kind === 'register' ? '/signup/profile' : '/password/reset/new',
        );
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.message === 'Too many verification attempts'
        )
          setAttemptsBlocked(true);
        throw error;
      }
    });
  }
  /** 재발송 시 이전 토큰과 코드 입력을 새 상태로 교체합니다. */
  async function resend() {
    if (!flow) return;
    const result = await api.requestVerification(flow.email, kind);
    setVerification({
      ...flow,
      token: result.verifyToken,
      expiresAt: Date.now() + 1_800_000,
      resendAt: Date.now() + 30_000,
    });
    setCode('');
    setAttemptsBlocked(false);
  }
  return (
    <>
      <BackLink to={start}>이메일 변경</BackLink>
      <span className="eyebrow">STEP 02 / 03</span>
      <h1>이메일을 확인해 주세요.</h1>
      <div className="info-banner">
        <strong>{flow.email}</strong>
        <p>이 주소로 보낸 인증 코드 6자리를 입력해 주세요.</p>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={action.pending}>
          <Field
            label="인증 코드"
            id="code"
            hint={`유효시간 ${Math.floor(expiry / 60)}분 ${expiry % 60}초 · 최대 5회 확인 가능`}
          >
            <Input
              id="code"
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              required
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
            />
          </Field>
          <ErrorNotice error={action.error} />
          <SubmitButton
            pending={action.pending}
            disabled={attemptsBlocked || expiry === 0}
            className="w-full"
          >
            확인하고 계속하기
          </SubmitButton>
          <Button
            className="mt-3 w-full"
            variant="ghost"
            type="button"
            disabled={remaining > 0}
            onClick={() => action.run(resend)}
          >
            {remaining ? `${remaining}초 후 새 코드 받기` : '새 코드 받기'}
          </Button>
        </fieldset>
      </form>
    </>
  );
}
/** 가입·비밀번호 변경·소셜 신규 가입에서 필요한 정보만 입력받습니다. */
export function ProfilePage({
  mode,
}: {
  mode: 'register' | 'reset' | 'social';
}) {
  const flow = useVerification();
  const social = getSocial();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [spent, setSpent] = useState(false);
  const [completedPath, setCompletedPath] = useState<string>();
  const action = useAction();
  // 완료 화면을 먼저 확정해 인증 정보 정리가 가입 단계 가드로 되돌리지 않게 합니다.
  useEffect(() => {
    if (!completedPath) return;
    setSocial(undefined);
    setVerification(undefined);
  }, [completedPath]);
  if (completedPath) return <Navigate replace to={completedPath} />;
  if (
    mode === 'social'
      ? !social
      : !flow?.verified ||
        flow.type !== (mode === 'register' ? 'register' : 'password')
  )
    return (
      <Navigate
        replace
        to={
          mode === 'reset'
            ? '/password/reset'
            : mode === 'social'
              ? '/login'
              : '/signup'
        }
      />
    );
  /** 소비되는 인증 토큰으로 한 번만 제출하고 성공 후 인증 상태를 정리합니다. */
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      if (mode !== 'reset') nameInput.parse(name);
      if (mode !== 'social') {
        passwordInput.parse(password);
        if (password.trim() !== confirm.trim())
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['passwordConfirm'],
              message: '비밀번호가 일치하지 않아요.',
            },
          ]);
      }
      setSpent(true);
      if (mode === 'reset' && flow) {
        await api.resetPassword(password, confirm, flow.token);
        clearTokens();
        await clearPrivateData();
        setCompletedPath('/login?reset=1');
        return;
      }
      const user =
        mode === 'social' && social
          ? await api.register(
              {
                provider: social.provider,
                providerId: social.providerId,
                name,
              },
              social.verifyToken,
            )
          : flow
            ? await api.register(
                {
                  provider: 'local',
                  email: flow.email,
                  name,
                  password,
                  passwordConfirm: confirm,
                },
                flow.token,
              )
            : undefined;
      if (!user) return;
      await clearPrivateData();
      queryClient.setQueryData(['session'], user);
      setCompletedPath('/emails');
    });
  }
  return (
    <>
      <span className="eyebrow">
        {mode === 'reset' ? 'NEW PASSWORD' : 'ONE LAST STEP'}
      </span>
      <h1>
        {mode === 'reset'
          ? '새 비밀번호를 설정하세요.'
          : '어떻게 불러드릴까요?'}
      </h1>
      <p className="intro">
        {mode === 'social'
          ? `${social?.provider === 'naver' ? '네이버' : 'Google'} 인증을 마쳤어요. 이름만 입력하면 준비가 끝나요.`
          : flow?.email}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={action.pending || spent}>
          {mode !== 'reset' && (
            <Field label="이름" id="profile-name" hint="2~8자로 입력해 주세요.">
              <Input
                id="profile-name"
                autoComplete="nickname"
                value={name}
                minLength={2}
                maxLength={8}
                required
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
          )}
          {mode !== 'social' && (
            <>
              <PasswordField
                label="비밀번호"
                id="new-password"
                value={password}
                autoComplete="new-password"
                required
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="password-checks">
                <span className={password.trim().length >= 8 ? 'valid' : ''}>
                  ✓ 8자 이상
                </span>
                <span
                  className={
                    passwordInput.safeParse(password).success ? 'valid' : ''
                  }
                >
                  ✓ 특수문자 포함
                </span>
              </p>
              <PasswordField
                label="비밀번호 확인"
                id="confirm-password"
                value={confirm}
                autoComplete="new-password"
                required
                onChange={(event) => setConfirm(event.target.value)}
              />
              {confirm && password.trim() !== confirm.trim() && (
                <p className="field-error">비밀번호가 일치하지 않아요.</p>
              )}
            </>
          )}
          <SubmitButton className="w-full" pending={action.pending}>
            {mode === 'reset' ? '비밀번호 변경' : '가입 완료'}
          </SubmitButton>
        </fieldset>
        <ErrorNotice error={action.error} />
        {spent && !action.pending && !!action.error && (
          <Button className="mt-4" variant="outline" asChild>
            <Link
              to={
                mode === 'reset'
                  ? '/password/reset'
                  : mode === 'social'
                    ? '/login'
                    : '/signup'
              }
            >
              인증 다시 시작하기
            </Link>
          </Button>
        )}
      </form>
    </>
  );
}
/** 제공자 콜백을 한 번 교환하고 기존 회원·신규 회원 화면으로 분기합니다. */
export function OAuthCallbackPage() {
  const { provider } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    let active = true;
    void finishOAuth(provider)
      .then(async (data) => {
        if (!active) return;
        if ('accessToken' in data.result) {
          const user = await api.getMe();
          if (!active) return;
          await clearPrivateData();
          queryClient.setQueryData(['session'], user);
          void navigate(data.returnTo, { replace: true });
        } else {
          setSocial({ ...data.result, provider: data.provider });
          void navigate('/signup/social', { replace: true });
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason);
      });
    return () => {
      active = false;
    };
  }, [provider, navigate]);
  return (
    <>
      <h1>
        {error ? '로그인을 다시 시작해 주세요.' : '로그인을 확인하고 있어요.'}
      </h1>
      {error ? (
        <>
          <ErrorNotice error={error} />
          <Button asChild>
            <Link to="/login">로그인으로 돌아가기</Link>
          </Button>
        </>
      ) : (
        <p role="status" className="intro flex gap-3">
          <LoaderCircle className="animate-spin" />
          잠시만 기다려 주세요.
        </p>
      )}
    </>
  );
}
