import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/api/endpoints';
import { clearTokens } from '@/api/client';
import { nameInput } from '@/api/models';
import { clearPrivateData, queryClient } from '@/app/query-client';
import { useDeliveries } from '@/hooks/queries';
import { useAction } from '@/hooks/use-action';
import {
  ConfirmDialog,
  EmptyState,
  ErrorNotice,
  Field,
  LoadingState,
  PageHeading,
  Pagination,
  SubmitButton,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { pageNumber } from '@/lib/pagination';
import { clearRuleDrafts } from '@/features/rules/drafts';
import { setSocial, setVerification } from '@/features/auth/flow';

/** 전달 이벤트를 페이지 단위로 보여주며 처리 상세를 인라인으로 엽니다. */
export function DeliveriesPage() {
  const [search, setSearch] = useSearchParams();
  const page = pageNumber(search.get('page'));
  const query = useDeliveries(page);
  return (
    <>
      <PageHeading
        title="전달 기록"
        description="메일을 전달하려고 시도한 기록을 확인하세요."
      />
      <div className="info-banner">
        각 행은 처리 이벤트예요. 재시도 기록이 메일의 최종 결과를 뜻하지는
        않아요.
      </div>
      <ErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending ? (
        <LoadingState />
      ) : (
        query.data && (
          <>
            {query.data.deliveries.length ? (
              <div className="panel delivery-list">
                {query.data.deliveries.map(({ delivery, source }) => (
                  <details key={delivery.id} className="delivery-row">
                    <summary>
                      <time>{formatDate(delivery.createdAt)}</time>
                      <span>
                        <strong>{source}</strong>
                        <small>→ {delivery.destination}</small>
                      </span>
                      <Badge
                        variant={
                          delivery.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {delivery.status === 'sent'
                          ? '전달 완료'
                          : delivery.status === 'retrying'
                            ? '재시도 기록'
                            : '전달 실패'}
                      </Badge>
                    </summary>
                    <div className="delivery-detail">
                      <p>
                        처리 상세:{' '}
                        {delivery.detail || '제공된 상세 정보가 없어요.'}
                      </p>
                      <p>이벤트 ID: {delivery.eventId}</p>
                      <p>메시지 ID: {delivery.messageId}</p>
                      <p>메일 본문은 이 화면에서 제공하지 않습니다.</p>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <EmptyState
                title="아직 전달 기록이 없어요"
                description="주소로 메일이 도착하고 전달을 시도하면 여기서 확인할 수 있어요."
              />
            )}
            <Pagination
              page={page}
              pages={Math.ceil(query.data.total / 20)}
              total={query.data.total}
              busy={query.isFetching}
              onChange={(next) => setSearch({ page: String(next) })}
            />
          </>
        )
      )}
    </>
  );
}
/** 서버 로그아웃 성공 뒤에만 민감한 메모리와 캐시를 정리합니다. */
async function endSession() {
  clearTokens();
  clearRuleDrafts();
  setSocial(undefined);
  setVerification(undefined);
  await clearPrivateData();
  try {
    localStorage.setItem('paperplane:logout', String(Date.now()));
  } catch {
    /* 저장소 차단 시에도 현재 탭의 로그아웃은 완료합니다. */
  }
}
/** 계정 정보 변경·로그아웃·탈퇴를 실제 API에 연결합니다. */
export function SettingsPage() {
  const session = useQuery({
    queryKey: ['session'],
    queryFn: api.getMe,
    staleTime: Infinity,
  });
  const [name, setName] = useState<string>();
  const [dialog, setDialog] = useState<'logout' | 'delete'>();
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const dialogAction = useAction();
  const navigate = useNavigate();
  /** 이름 변경 결과를 사용자 캐시에 반영합니다. */
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      const user = await api.updateName(
        nameInput.parse(name ?? session.data?.name),
      );
      queryClient.setQueryData(['session'], user);
      setName(undefined);
      setSaved(true);
    });
  }
  if (!session.data) return <LoadingState />;
  return (
    <>
      <PageHeading
        title="계정 설정"
        description="내 정보와 계정을 관리하세요."
      />
      <form className="panel narrow-panel" onSubmit={submit}>
        <h2>프로필</h2>
        <Field id="account-name" label="이름" hint="2~8자로 입력해 주세요.">
          <Input
            id="account-name"
            value={name ?? session.data.name}
            maxLength={8}
            minLength={2}
            required
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field id="account-email" label="로그인 계정">
          <Input
            id="account-email"
            readOnly
            value={session.data.email ?? `${session.data.provider} 소셜 계정`}
          />
        </Field>
        <ErrorNotice error={action.error} />
        {saved && (
          <p role="status" className="info-banner">
            이름을 저장했어요.
          </p>
        )}
        <SubmitButton pending={action.pending}>변경 사항 저장</SubmitButton>
      </form>
      <section className="panel narrow-panel">
        <h2>보안과 로그인</h2>
        <p className="mb-4">
          {session.data.provider === 'local'
            ? '이메일 인증을 거쳐 비밀번호를 새로 설정할 수 있어요.'
            : '비밀번호는 연결된 소셜 서비스에서 관리합니다.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {session.data.provider === 'local' && (
            <Button variant="outline" asChild>
              <Link to="/password/reset">비밀번호 변경</Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              dialogAction.clearError();
              setDialog('logout');
            }}
          >
            로그아웃
          </Button>
        </div>
      </section>
      <section className="danger-panel narrow-panel">
        <div>
          <h2>계정 삭제</h2>
          <p>주소·전달 설정·받는 메일함·기록을 삭제합니다.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            dialogAction.clearError();
            setChecked(false);
            setDialog('delete');
          }}
        >
          계정 삭제
        </Button>
      </section>
      <ConfirmDialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open) setDialog(undefined);
        }}
        title={dialog === 'delete' ? '계정을 삭제할까요?' : '로그아웃할까요?'}
        description={
          dialog === 'delete'
            ? '계정과 연결된 데이터는 삭제 후 복구할 수 없습니다.'
            : '이 브라우저의 로그인 세션을 종료합니다.'
        }
        action={dialog === 'delete' ? '계정 영구 삭제' : '로그아웃'}
        pending={dialogAction.pending}
        error={dialogAction.error}
        disabled={dialog === 'delete' && !checked}
        onConfirm={() => {
          void dialogAction.run(async () => {
            if (dialog === 'delete') await api.deleteAccount();
            else await api.logout();
            await endSession();
            void navigate('/login', { replace: true });
          });
        }}
      >
        {dialog === 'delete' && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            삭제되는 내용을 확인했습니다.
          </label>
        )}
      </ConfirmDialog>
    </>
  );
}
