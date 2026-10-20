import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Link, useBlocker } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  LoaderCircle,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { ApiError, errorMessage } from '@/api/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

/** 화면 제목·설명·주 행동을 공통 간격으로 배치합니다. */
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
/** 오류를 읽기 가능한 영역으로 안내하고 새 오류에 포커스를 보냅니다. */
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  return (
    <div ref={ref} role="alert" tabIndex={-1} className="error-notice">
      <p>{errorMessage(error)}</p>
      {error instanceof ApiError &&
        (error.status === 401 || error.message === 'invalid refresh token') && (
          <Button variant="outline" asChild>
            <Link to="/login">다시 로그인</Link>
          </Button>
        )}
      {retry && (
        <Button variant="outline" onClick={retry}>
          <RefreshCw />
          다시 시도
        </Button>
      )}
    </div>
  );
}
/** 목록이 비었을 때 다음 행동을 안내합니다. */
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="icon-tile">
        <Mail />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
/** 실제 데이터가 없는 로딩을 빈 목록과 구분합니다. */
export function LoadingState() {
  return (
    <div role="status" aria-label="불러오는 중" className="space-y-4">
      <span className="sr-only">불러오는 중…</span>
      {[1, 2, 3].map((row) => (
        <div key={row} className="h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
/** 필드의 label과 도움말을 입력에 연결합니다. */
export function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
    </div>
  );
}
/** 비밀번호 값은 메모리에 두고 표시 여부만 전환합니다. */
export function PasswordField({
  id,
  label,
  ...props
}: ComponentProps<typeof Input> & { id: string; label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} id={id}>
      <div className="password-input">
        <Input {...props} id={id} type={visible ? 'text' : 'password'} />
        <Button
          type="button"
          variant="ghost"
          aria-label={`${label} ${visible ? '숨기기' : '보기'}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? '숨기기' : '보기'}
        </Button>
      </div>
    </Field>
  );
}
/** 제출 중 상태를 동일한 버튼 패턴으로 표시합니다. */
export function SubmitButton({
  pending,
  children,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
    >
      {pending && <LoaderCircle className="animate-spin" />}
      {pending ? '처리 중…' : children}
    </Button>
  );
}
/** Clipboard API 실패 시 수동 복사를 제공해 브라우저 제약을 처리합니다. */
export function CopyButton({ value }: { value: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  useEffect(() => {
    if (state !== 'copied') return;
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);
  /** 사용자가 선택한 주소를 복사합니다. */
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('manual');
    }
  }
  return (
    <span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={state === 'copied' ? '복사됨' : `${value} 복사`}
        onClick={copy}
      >
        {state === 'copied' ? <Check /> : <Copy />}
      </Button>
      <span className="sr-only" role="status">
        {state === 'copied' ? '복사했어요.' : ''}
      </span>
      {state === 'manual' && (
        <Input
          aria-label="직접 복사할 주소"
          value={value}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </span>
  );
}
/** 파괴적 행동은 취소에 먼저 포커스되는 shadcn 확인창에서 실행합니다. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  pending,
  error,
  children,
  onConfirm,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  action: string;
  pending: boolean;
  error?: unknown;
  children?: ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <ErrorNotice error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending || disabled}
            onClick={onConfirm}
          >
            {pending ? '처리 중…' : action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
/** 편집 이탈과 새로고침을 구분해 미저장 데이터 손실을 안내합니다. */
export function UnsavedGuard({
  dirty,
  allowPath,
}: {
  dirty: boolean;
  allowPath?: string;
}) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      currentLocation.pathname !== nextLocation.pathname &&
      !nextLocation.pathname.startsWith(allowPath || '\0'),
  );
  useEffect(() => {
    /** 브라우저 종료·새로고침에서는 기본 확인 UI를 사용합니다. */
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset();
      }}
      title="변경 사항을 저장하지 않았어요"
      description="나가면 작성한 변경 사항이 사라집니다. 계속 작성하려면 취소해 주세요."
      action="저장하지 않고 나가기"
      pending={false}
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}
/** 현재 서버 페이지와 전체 페이지를 접근 가능한 이전·다음 버튼으로 표시합니다. */
export function Pagination({
  page,
  pages,
  total,
  busy,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  busy: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav aria-label="페이지 이동" className="pagination">
      <span>전체 {total}개</span>
      <div>
        <Button
          variant="ghost"
          disabled={page <= 1 || busy}
          onClick={() => onChange(page - 1)}
        >
          이전
        </Button>
        <span aria-live="polite">
          {page} / {Math.max(1, pages)}
        </span>
        <Button
          variant="ghost"
          disabled={page >= pages || busy}
          onClick={() => onChange(page + 1)}
        >
          다음
        </Button>
      </div>
    </nav>
  );
}
/** 상세 화면에서 목록으로 돌아가는 경로를 제공합니다. */
export function BackLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="back-link" to={to}>
      <ArrowLeft size={16} />
      {children}
    </Link>
  );
}
