import { drafts } from '@/features/rules/drafts';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
  useNavigate,
} from 'react-router-dom';
import * as api from '@/api/endpoints';
import {
  type Forward,
  type Mail,
  type Rule,
  type TestResult,
  mailSchema,
} from '@/api/models';
import { refreshWorkspace } from '@/app/query-client';
import { useEmails, useDestinations } from '@/hooks/queries';
import { useAction } from '@/hooks/use-action';
import {
  BackLink,
  EmptyState,
  ErrorNotice,
  Field,
  LoadingState,
  PageHeading,
  SubmitButton,
  UnsavedGuard,
} from '@/components/shared';
import { Button } from '@/components/ui/button';

import { SampleMail } from '@/features/rules/sample';
import { Conditions } from '@/features/rules/conditions';
import { describeRule, newGroup, validateRule } from '@/features/rules/model';
import { ApiError } from '@/api/client';
import { pageNumber } from '@/lib/pagination';

/** 서버에서 받은 실제 주소와 규칙이 준비된 후 편집기를 엽니다. */
export function RulePage() {
  const { id, ruleId } = useParams();
  const [search] = useSearchParams();
  const page = pageNumber(search.get('page'));
  const query = useEmails(page);
  const address = query.data?.emails.find((item) => item.id === Number(id));
  const existing = address?.forwards.find((item) => item.id === Number(ruleId));
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
  if (!address || (ruleId !== 'new' && !existing))
    return (
      <EmptyState
        title="설정을 다시 선택해 주세요"
        description="주소 목록에서 수정할 항목을 다시 열어 주세요."
      >
        <Button asChild>
          <Link to="/emails">내 이메일</Link>
        </Button>
      </EmptyState>
    );
  return (
    <RuleEditor
      key={`${id}-${ruleId}`}
      emailId={address.id}
      source={address.src}
      page={page}
      existing={existing}
    />
  );
}
/** 규칙 초안·목적지·서버 샘플 검증을 관리합니다. */
function RuleEditor({
  emailId,
  source,
  page,
  existing,
}: {
  emailId: number;
  source: string;
  page: number;
  existing?: Forward;
}) {
  const location = useLocation();
  const [search] = useSearchParams();
  const draftKey = location.pathname;
  const saved = drafts.get(draftKey);
  const [dest, setDest] = useState(
    search.get('destination') || saved?.dest || existing?.dest || '',
  );
  const [rule, setRule] = useState<Rule>(saved?.rule ?? existing?.rule ?? []);
  const [conditional, setConditional] = useState(rule.length > 0);
  const destinations = useDestinations();
  const action = useAction();
  const testAction = useAction();
  const navigate = useNavigate();
  const [testResult, setTestResult] = useState<{
    key: string;
    value: TestResult;
  }>();
  const [sample, setSample] = useState<Mail>({
    headers: [],
    envelope: { from: 'sender@example.com', recipients: [source] },
    from: { name: '보낸 사람', address: 'sender@example.com' },
    subject: '이번 달 영수증',
    date: new Date().toISOString(),
    content: '주문해 주셔서 감사합니다.',
    attachments: [],
    contentSize: 0,
  });
  useEffect(() => {
    drafts.delete(draftKey);
  }, [draftKey]);
  const fingerprint = JSON.stringify([rule, sample]);
  const current = useRef(fingerprint);
  current.current = fingerprint;
  const back = `/email/${emailId}?page=${page}`;
  const dirty =
    dest !== (existing?.dest ?? '') ||
    JSON.stringify(rule) !== JSON.stringify(existing?.rule ?? []);
  /** 인증 왕복에 필요한 초안만 메모리에 보관합니다. */
  function preserve() {
    drafts.set(draftKey, { dest, rule });
  }
  /** 검증된 목적지와 유효한 규칙을 한 번 저장합니다. */
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      if (conditional && !rule.length)
        throw new ApiError(
          422,
          '조건 그룹을 추가하거나 모든 메일을 선택해 주세요.',
        );
      validateRule(rule);
      if (!destinations.data?.some((item) => item.address === dest))
        throw new ApiError(422, '인증된 받는 메일함을 선택해 주세요.');
      await api.saveForward({ emailId, dest, rule, forwardId: existing?.id });
      drafts.delete(draftKey);
      await refreshWorkspace();
      void navigate(back);
    });
  }
  /** 바뀐 초안에 이전 비동기 테스트 응답이 표시되지 않게 합니다. */
  async function test() {
    validateRule(rule);
    const mail = mailSchema.parse(sample);
    const key = fingerprint;
    const result = await api.testForward(rule, mail);
    if (key === current.current) setTestResult({ key, value: result });
  }
  return (
    <>
      <BackLink to={back}>주소 상세</BackLink>
      <PageHeading
        title={existing ? '전달 설정 수정' : '전달 설정 추가'}
        description={`${source}로 도착한 메일을 어떻게 전달할까요?`}
      />
      <div className="editor-layout">
        <form onSubmit={submit}>
          <fieldset disabled={action.pending}>
            <section className="panel">
              <h2>1. 받는 메일함</h2>
              <ErrorNotice
                error={destinations.error}
                retry={() => {
                  void destinations.refetch();
                }}
              />
              <Field id="rule-destination" label="인증된 메일함">
                <select
                  id="rule-destination"
                  value={dest}
                  required
                  onChange={(event) => setDest(event.target.value)}
                >
                  <option value="">메일함 선택</option>
                  {destinations.data?.map((item) => (
                    <option key={item.id} value={item.address}>
                      {item.address}
                    </option>
                  ))}
                </select>
              </Field>
              <Button asChild variant="outline">
                <Link
                  onClick={preserve}
                  to={`/destinations/new?returnTo=${encodeURIComponent(location.pathname + `?page=${page}`)}`}
                >
                  새 메일함 인증하기
                </Link>
              </Button>
            </section>
            <section className="panel">
              <h2>2. 전달 조건</h2>
              <div className="mode-options">
                <label>
                  <input
                    type="radio"
                    name="mode"
                    checked={!conditional}
                    onChange={() => {
                      setConditional(false);
                      setRule([]);
                    }}
                  />{' '}
                  모든 메일 전달
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    checked={conditional}
                    onChange={() => {
                      setConditional(true);
                      setRule([newGroup()]);
                    }}
                  />{' '}
                  조건에 맞는 메일만
                </label>
              </div>
              {conditional && <Conditions rule={rule} onChange={setRule} />}
            </section>
            <ErrorNotice error={action.error} />
            <div className="form-actions sticky-actions">
              <Button variant="outline" asChild>
                <Link to={back}>취소</Link>
              </Button>
              <SubmitButton
                pending={action.pending}
                disabled={destinations.isPending || !!destinations.error}
              >
                전달 설정 저장
              </SubmitButton>
            </div>
          </fieldset>
        </form>
        <aside>
          <section className="panel rule-summary">
            <span className="eyebrow">PREVIEW</span>
            <h2>이렇게 전달돼요</h2>
            <p className="break-all">{source}</p>
            <div className="summary-rule">{describeRule(rule)}</div>
            <p className="break-all">↓ {dest || '받는 메일함 선택'}</p>
            <p className="hint">
              조건 그룹은 하나라도 맞으면 전달합니다. 저장 완료와 실제 전송
              결과는 다를 수 있어요.
            </p>
          </section>
          <section className="panel">
            <h2>샘플 메일 테스트</h2>
            <p className="hint">
              실제 메일은 발송하지 않아요. 샘플 내용을 입력해 전달 조건에 맞는지
              확인하세요.
            </p>
            <SampleMail value={sample} onChange={setSample} />
            <Button
              type="button"
              variant="outline"
              disabled={testAction.pending}
              onClick={() => testAction.run(test)}
            >
              {testAction.pending ? '확인 중…' : '조건 테스트'}
            </Button>
            <ErrorNotice error={testAction.error} />
            {testResult && (
              <div className="info-banner" role="status">
                {testResult.key !== fingerprint ? (
                  '조건이나 샘플이 바뀌었어요. 다시 테스트해 주세요.'
                ) : (
                  <>
                    <strong>
                      {testResult.value.matches
                        ? '전달 조건에 맞아요'
                        : '전달 조건에 맞지 않아요'}
                    </strong>
                    {testResult.value.groups.map((matches, index) => (
                      <p key={index}>
                        그룹 {index + 1}: {matches ? '일치' : '불일치'}
                      </p>
                    ))}
                  </>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
      <UnsavedGuard
        dirty={dirty && !action.pending}
        allowPath="/destinations/new"
      />
    </>
  );
}
