import { pageNumber } from '@/lib/pagination';
import { useState, type FormEvent } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { ArrowRight, Plus, Mail } from 'lucide-react';
import * as api from '@/api/endpoints';
import { emailInput, type EmailAddress } from '@/api/models';
import { useEmails, useDestinations, useDomains } from '@/hooks/queries';
import { useAction } from '@/hooks/use-action';
import { refreshWorkspace } from '@/app/query-client';
import {
  BackLink,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  ErrorNotice,
  Field,
  LoadingState,
  PageHeading,
  Pagination,
  SubmitButton,
  UnsavedGuard,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/** 인증된 목적지와 전달 규칙으로 설정 상태를 계산합니다. */
function addressStatus(
  address: EmailAddress,
  destinations: string[] | undefined,
) {
  if (!address.forwards.length) return '설정 필요';
  if (!destinations) return '상태 확인 필요';
  return address.forwards.every((rule) => destinations.includes(rule.dest))
    ? '설정 완료'
    : '메일함 인증 필요';
}
/** 실제 서버 페이지의 주소 목록과 설정 상태를 표시합니다. */
export function EmailsPage() {
  const [search, setSearch] = useSearchParams();
  const page = pageNumber(search.get('page'));
  const query = useEmails(page);
  const destinations = useDestinations();
  return (
    <>
      <PageHeading
        title="내 이메일"
        description="용도별로 주소를 나누고, 원하는 메일함으로 받아 보세요."
      >
        <Button asChild>
          <Link to="/emails/new">
            <Plus />새 주소 만들기
          </Link>
        </Button>
      </PageHeading>
      <div className="info-banner">
        주소를 만든 다음 받는 메일함과 전달 조건을 연결해 주세요.
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
            {!query.data.emails.length ? (
              <EmptyState
                title="첫 이메일 주소를 만들어 보세요"
                description="쇼핑, 업무, 뉴스레터를 서로 다른 주소로 관리할 수 있어요."
              >
                <Button asChild>
                  <Link to="/emails/new">새 주소 만들기</Link>
                </Button>
              </EmptyState>
            ) : (
              <div className="address-grid">
                {query.data.emails.map((address) => (
                  <article className="address-card" key={address.id}>
                    <div className="flex items-center justify-between">
                      <span className="icon-tile">
                        <Mail />
                      </span>
                      <Badge variant="secondary">
                        {addressStatus(
                          address,
                          destinations.error
                            ? undefined
                            : destinations.data?.map((item) => item.address),
                        )}
                      </Badge>
                    </div>
                    <div className="address-title">
                      <Link to={`/email/${address.id}?page=${page}`}>
                        {address.src}
                      </Link>
                      <CopyButton value={address.src} />
                    </div>
                    <p>전달 설정 {address.totalForwards}개</p>
                    <div className="card-destination">
                      {address.forwards[0]?.dest ??
                        '아직 연결된 메일함이 없어요'}
                    </div>
                    <Link
                      className="card-link"
                      to={`/email/${address.id}?page=${page}`}
                    >
                      전달 설정 관리 <ArrowRight size={16} />
                    </Link>
                  </article>
                ))}
              </div>
            )}
            <Pagination
              page={page}
              pages={query.data.pages}
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
/** API가 허용하는 도메인으로 주소를 생성합니다. */
export function NewEmailPage() {
  const domains = useDomains();
  const [local, setLocal] = useState('');
  const [domain, setDomain] = useState('');
  const action = useAction();
  const navigate = useNavigate();
  const selected = domain || domains.data?.[0]?.name || '';
  const src = `${local}@${selected}`;
  /** 성공한 생성 결과를 완료 화면에 전달합니다. */
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      emailInput.parse(src);
      const email = await api.createEmail(src);
      await refreshWorkspace();
      void navigate(
        `/emails/created?address=${encodeURIComponent(email.src)}`,
        { replace: true },
      );
    });
  }
  return (
    <>
      <BackLink to="/emails">내 이메일</BackLink>
      <PageHeading
        title="새 이메일 주소 만들기"
        description="사용할 곳이 떠오르는 이름으로 만들어 보세요."
      />
      <div className="split-layout">
        <form className="panel" onSubmit={submit}>
          <h2>주소 정보</h2>
          <ErrorNotice
            error={domains.error}
            retry={() => {
              void domains.refetch();
            }}
          />
          <fieldset disabled={action.pending || domains.isPending}>
            <Field
              label="주소 이름"
              id="address-name"
              hint="영문, 숫자 등 이메일 주소로 사용할 수 있는 문자를 입력해 주세요."
            >
              <Input
                id="address-name"
                value={local}
                onChange={(event) => setLocal(event.target.value)}
                required
                maxLength={64}
                placeholder="shopping"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </Field>
            <Field label="도메인" id="domain">
              <select
                id="domain"
                value={selected}
                disabled={(domains.data?.length ?? 0) <= 1}
                onChange={(event) => setDomain(event.target.value)}
              >
                {domains.data?.map((item) => (
                  <option key={item.id} value={item.name}>
                    @{item.name}
                  </option>
                ))}
              </select>
            </Field>
            {domains.data?.length === 0 && (
              <p role="status">현재 생성 가능한 도메인이 없어요.</p>
            )}
            <div className="address-preview">
              <small>완성될 이메일 주소</small>
              <strong>{local ? src : `your-name@${selected || '…'}`}</strong>
            </div>
            <ErrorNotice error={action.error} />
            <div className="form-actions">
              <Button asChild variant="outline">
                <Link to="/emails">취소</Link>
              </Button>
              <SubmitButton
                pending={action.pending}
                disabled={!selected || !local}
              >
                주소 만들기
              </SubmitButton>
            </div>
          </fieldset>
        </form>
        <aside className="help-panel">
          <span className="eyebrow">A NAME FOR EVERY PURPOSE</span>
          <h2>주소마다 역할을 정해 보세요.</h2>
          <p>shopping · 쇼핑 알림과 영수증</p>
          <p>work · 업무 연락</p>
          <p>letter · 읽고 싶은 뉴스레터</p>
          <hr />
          <p>
            생성만으로 메일이 전달되지는 않아요. 다음 단계에서 받는 메일함을
            연결해 주세요.
          </p>
        </aside>
      </div>
      <UnsavedGuard dirty={!!local && !action.pending} />
    </>
  );
}
/** 생성된 주소를 복사하고 목록에서 다음 설정을 시작하도록 안내합니다. */
export function CreatedEmailPage() {
  const [search] = useSearchParams();
  const address = search.get('address') || '';
  return (
    <div className="success-panel panel">
      <span className="icon-tile">
        <Mail />
      </span>
      <h1>새 주소가 준비됐어요.</h1>
      <p>받는 메일함을 연결하면 전달 설정을 완료할 수 있어요.</p>
      <div className="address-preview">
        <strong>{address}</strong>
        <CopyButton value={address} />
      </div>
      <Button asChild>
        <Link to="/emails">
          내 이메일에서 연결하기 <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
/** 목록에 포함된 주소의 전달 규칙과 삭제 동작을 제공합니다. */
export function EmailDetailPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const page = pageNumber(search.get('page'));
  const query = useEmails(page);
  const email = query.data?.emails.find((item) => item.id === Number(id));
  const [remove, setRemove] = useState(false);
  const [forwardId, setForwardId] = useState<number>();
  const action = useAction();
  const navigate = useNavigate();
  /** 대상 주소 또는 선택한 규칙을 지우고 최신 목록으로 갱신합니다. */
  async function confirm() {
    if (!email) return;
    if (forwardId !== undefined) {
      await api.deleteForward(email.id, forwardId);
      setForwardId(undefined);
    } else {
      await api.deleteEmail(email.id);
      void navigate(`/emails?page=${page}`);
    }
    setRemove(false);
    await refreshWorkspace();
  }
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  if (!email)
    return (
      <EmptyState
        title="목록에서 주소를 다시 선택해 주세요"
        description="이 페이지에 주소가 없거나 이미 삭제됐을 수 있어요."
      >
        <Button asChild>
          <Link to="/emails">내 이메일</Link>
        </Button>
      </EmptyState>
    );
  return (
    <>
      <BackLink to={`/emails?page=${page}`}>내 이메일</BackLink>
      <PageHeading
        title={email.src}
        description="주소에 연결된 전달 설정을 관리하세요."
      >
        <CopyButton value={email.src} />
      </PageHeading>
      <section className="panel">
        <div className="section-heading">
          <h2>
            전달 설정{' '}
            <span className="text-muted-foreground">{email.totalForwards}</span>
          </h2>
          <Button asChild>
            <Link to={`/email/${email.id}/rule/new?page=${page}`}>
              <Plus />
              전달 설정 추가
            </Link>
          </Button>
        </div>
        {email.forwards.length ? (
          email.forwards.map((rule) => (
            <article className="rule-row" key={rule.id}>
              <div>
                <strong>{rule.dest}</strong>
                <p>
                  {rule.rule?.length
                    ? `조건 그룹 ${rule.rule.length}개 중 하나라도 일치하면 전달`
                    : '모든 메일 전달'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to={`/email/${email.id}/rule/${rule.id}?page=${page}`}>
                    수정
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    action.clearError();
                    setForwardId(rule.id);
                    setRemove(true);
                  }}
                >
                  삭제
                </Button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="받는 메일함을 연결해 주세요"
            description="모든 메일을 전달하거나 필요한 메일만 골라 받을 수 있어요."
          />
        )}
      </section>
      <section className="danger-panel">
        <div>
          <h2>이메일 주소 삭제</h2>
          <p>이 주소와 연결된 전달 설정 및 전달 기록도 삭제됩니다.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            action.clearError();
            setForwardId(undefined);
            setRemove(true);
          }}
        >
          주소 삭제
        </Button>
      </section>
      <ConfirmDialog
        open={remove}
        onOpenChange={setRemove}
        title={forwardId ? '전달 설정을 삭제할까요?' : '이 주소를 삭제할까요?'}
        description={
          forwardId
            ? '이 설정을 통한 메일 전달이 중단됩니다.'
            : `${email.src}와 연결된 전달 설정 및 전달 기록이 삭제됩니다. 되돌릴 수 없어요.`
        }
        action="삭제"
        pending={action.pending}
        error={action.error}
        onConfirm={() => {
          void action.run(confirm);
        }}
      />
    </>
  );
}
