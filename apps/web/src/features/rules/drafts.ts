import type { Rule } from '@/api/models';
export const drafts = new Map<string, { dest: string; rule: Rule }>();
/** 로그아웃 시 편집 중인 개인정보도 제거합니다. */
export function clearRuleDrafts() {
  drafts.clear();
}
