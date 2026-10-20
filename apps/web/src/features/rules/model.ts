import { ApiError } from '@/api/client';
import { type Rule, type RuleGroup, ruleSchema } from '@/api/models';
export const textFields: {
  key: 'subject' | 'name' | 'from' | 'content';
  label: string;
}[] = [
  { key: 'subject', label: '제목' },
  { key: 'name', label: '보낸 사람 이름' },
  { key: 'from', label: '보낸 사람 주소' },
  { key: 'content', label: '본문' },
];
/** 빈 그룹을 명시적인 편집 초안으로 만듭니다. */
export function newGroup(): RuleGroup {
  return {
    type: 'and',
    postRule: {
      newsletter: 'all',
      subject: { type: 'and', regexp: [{ type: 'middle', value: '' }] },
    },
  };
}
/** 허용하지 않는 빈 조건과 역전된 기간을 저장 전에 검증합니다. */
export function validateRule(rule: Rule): Rule {
  ruleSchema.parse(rule);
  for (const group of rule) {
    const post = group.postRule;
    if (
      post.newsletter === 'all' &&
      !textFields.some(({ key }) => post[key]) &&
      !post.date?.length &&
      !post.attachment
    )
      throw new ApiError(422, '각 그룹에 조건을 하나 이상 추가해 주세요.');
    for (const { key } of textFields) {
      const text = post[key];
      if (
        text &&
        (!text.regexp.length || text.regexp.some((term) => !term.value.trim()))
      )
        throw new ApiError(
          422,
          '비어 있는 검색어를 입력하거나 조건을 삭제해 주세요.',
        );
    }
    for (const date of post.date ?? []) {
      if (
        (!date.startDate && !date.endDate) ||
        (date.startDate && Number.isNaN(Date.parse(date.startDate))) ||
        (date.endDate && Number.isNaN(Date.parse(date.endDate)))
      )
        throw new ApiError(422, '기간의 시작 또는 종료 날짜를 입력해 주세요.');
      if (
        date.startDate &&
        date.endDate &&
        Date.parse(date.startDate) > Date.parse(date.endDate)
      )
        throw new ApiError(422, '종료 날짜는 시작 날짜 이후여야 해요.');
    }
    if (
      post.attachment &&
      (!post.attachment.attachment.length ||
        post.attachment.attachment.some(
          (item) =>
            (!item.filename && !item.ext?.trim()) ||
            (item.filename && !item.filename.value.trim()),
        ))
    )
      throw new ApiError(422, '첨부파일 이름 또는 확장자를 입력해 주세요.');
  }
  return rule;
}
/** 날짜만 입력한 값은 사용자 현지 날짜의 양 끝 경계로 변환합니다. */
export function dateBoundary(value: string, end: boolean) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (end) {
    date.setDate(date.getDate() + 1);
    date.setMilliseconds(-1);
  }
  return date.toISOString();
}
/** 저장된 시간의 현지 날짜만 보여주고 값은 사용자가 수정할 때만 교체합니다. */
export function localDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
/** 전체 규칙의 조건을 사람이 읽을 수 있는 문장으로 설명합니다. */
export function describeRule(rule: Rule) {
  if (!rule.length) return '모든 메일을 전달합니다.';
  return rule
    .map((group, index) => {
      const post = group.postRule;
      const parts = textFields.flatMap(({ key, label }) =>
        post[key]
          ? [
              `${label}: ${post[key].regexp.map((term) => `“${term.value || '검색어'}” ${term.type === 'middle' ? '포함' : term.type === 'prefix' ? '시작' : '끝'}`).join(post[key].type === 'and' ? ' 그리고 ' : ' 또는 ')}`,
            ]
          : [],
      );
      if (post.newsletter !== 'all')
        parts.push(post.newsletter ? '뉴스레터' : '뉴스레터 아님');
      if (post.date?.length)
        parts.push(`기간 ${post.date.length}개 중 하나 일치`);
      if (post.attachment)
        parts.push(
          `같은 첨부파일에서 조건 ${post.attachment.type === 'and' ? '모두' : '하나 이상'} 일치`,
        );
      return `그룹 ${index + 1}: ${parts.join(group.type === 'and' ? ' 그리고 ' : ' 또는 ') || '조건을 추가해 주세요'}`;
    })
    .join('\n또는\n');
}
