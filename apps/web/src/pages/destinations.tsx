import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { z } from 'zod';
import * as api from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { emailInput, type Destination } from '@/api/models';
import { refreshWorkspace } from '@/app/query-client';
import { useDestinations } from '@/hooks/queries';
import { useAction } from '@/hooks/use-action';
import { useCountdown } from '@/hooks/use-countdown';
import { safeReturnTo } from '@/lib/utils';
import {
  BackLink,
  ConfirmDialog,
  EmptyState,
  ErrorNotice,
  Field,
  LoadingState,
  PageHeading,
  SubmitButton,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/** 인증된 수신 목적지와 삭제 시 영향 범위를 표시합니다. */
export function DestinationsPage() {
  const query = useDestinations();
  const [selected, setSelected] = useState<Destination>();
  const action = useAction();
  return (
    <>
      <PageHeading
        title="받는 메일함"
        description="실제 메일을 받을, 내가 소유한 메일함을 연결하세요."
      >
        <Button asChild>
          <Link to="/destinations/new">
            <Plus />
            메일함 추가
          </Link>
        </Button>
      </PageHeading>
      <div className="info-banner">
        메일함을 인증하면 여러 Paperplane 주소에서 함께 사용할 수 있어요.
      </div>
      <ErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.data?.length ? (
        <div className="panel">
          {query.data.map((item) => (
            <article className="rule-row" key={item.id}>
              <div>
                <strong>{item.address}</strong>
                <p>
                  <Badge variant="secondary">
                    <Check size={12} /> 인증 완료
                  </Badge>
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  action.clearError();
                  setSelected(item);
                }}
              >
                삭제
              </Button>
            </article>
          ))}
        </div>
      ) : (
        !query.error && (
          <EmptyState
            title="아직 연결한 메일함이 없어요"
            description="기존에 쓰던 메일함을 인증하고 첫 번째 연결을 시작해 보세요."
          >
            <Button asChild>
              <Link to="/destinations/new">메일함 추가</Link>
            </Button>
          </EmptyState>
        )
      )}
      <ConfirmDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
        title="받는 메일함을 삭제할까요?"
        description={`${selected?.address ?? ''} 인증과 이 메일함으로 연결된 본인의 전달 설정이 함께 삭제됩니다.`}
        action="메일함 삭제"
        pending={action.pending}
        error={action.error}
        onConfirm={() => {
          void action.run(async () => {
            if (!selected) return;
            await api.deleteDestination(selected.id);
            setSelected(undefined);
            await refreshWorkspace();
          });
        }}
      />
    </>
  );
}
/** 일회용 목적지 인증과 재발송 대기 시간을 관리합니다. */
export function NewDestinationPage() {
  const [search] = useSearchParams();
  const returnTo = safeReturnTo(search.get('returnTo'), '/destinations');
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<string>();
  const [spent, setSpent] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [expires, setExpires] = useState(0);
  const remaining = useCountdown(deadline);
  const expiry = useCountdown(expires);
  const action = useAction();
  /** 새 코드 발송에 성공한 경우에만 기존 challenge를 교체합니다. */
  async function send() {
    emailInput.parse(address);
    try {
      const result = await api.requestDestination(address);
      setChallenge(result.verificationToken);
      setSpent(false);
      setCode('');
      setDeadline(Date.now() + 60_000);
      setExpires(Date.now() + result.expiresIn * 1000);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429)
        setDeadline(Date.now() + (error.retryAfter || 60) * 1000);
      throw error;
    }
  }
  /** 한 번 사용한 challenge는 오류가 나도 재사용하지 않습니다. */
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      if (!challenge) {
        await send();
        return;
      }
      z.string()
        .regex(/^\d{6}$/, '인증 코드 6자리를 입력해 주세요.')
        .parse(code);
      setSpent(true);
      await api.confirmDestination(challenge, code);
      await refreshWorkspace();
      const separator = returnTo.includes('?') ? '&' : '?';
      void navigate(
        `${returnTo}${separator}destination=${encodeURIComponent(address)}`,
        { replace: true },
      );
    });
  }
  return (
    <>
      <BackLink to={returnTo}>돌아가기</BackLink>
      <PageHeading
        title="받는 메일함 연결"
        description="실제 메일을 받을 주소의 소유 여부를 확인할게요."
      />
      <form className="panel narrow-panel" onSubmit={submit}>
        <fieldset disabled={action.pending}>
          <Field label="받는 이메일 주소" id="destination">
            <Input
              id="destination"
              type="email"
              autoComplete="email"
              value={address}
              required
              readOnly={!!challenge}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="hello@example.com"
            />
          </Field>
          {challenge && (
            <>
              <div className="info-banner">
                인증 코드를 보냈어요. {Math.floor(expiry / 60)}분 {expiry % 60}
                초 안에 확인해 주세요.
              </div>
              <Field
                label="인증 코드"
                id="destination-code"
                hint="코드는 한 번만 확인할 수 있어요. 틀리면 새 코드를 받아 주세요."
              >
                <Input
                  id="destination-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  maxLength={6}
                  required
                />
              </Field>
            </>
          )}
          <ErrorNotice error={action.error} />
          <SubmitButton
            pending={action.pending}
            className="w-full"
            disabled={challenge ? spent || expiry === 0 : remaining > 0}
          >
            {challenge ? '인증하고 연결하기' : '인증 코드 받기'}
          </SubmitButton>
          {challenge && (
            <div className="form-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={remaining > 0}
                onClick={() => action.run(send)}
              >
                {remaining ? `${remaining}초 후 새 코드 받기` : '새 코드 받기'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setChallenge(undefined);
                  setSpent(false);
                  action.clearError();
                }}
              >
                주소 변경
              </Button>
            </div>
          )}
        </fieldset>
      </form>
    </>
  );
}
