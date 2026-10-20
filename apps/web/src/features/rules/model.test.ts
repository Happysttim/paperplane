import { describe, expect, it } from 'vitest';
import { ruleSchema, type Rule } from '@/api/models';
import { dateBoundary, validateRule } from './model';

describe('전달 규칙 보존과 검증', () => {
  it('복합 규칙과 기존의 정확한 시각을 수정 없이 보존한다', () => {
    const rule: Rule = [
      {
        type: 'or',
        postRule: {
          newsletter: false,
          subject: {
            type: 'and',
            regexp: [
              { type: 'prefix', value: '회의' },
              { type: 'suffix', value: '안내' },
            ],
          },
          name: { type: 'or', regexp: [{ type: 'middle', value: '팀' }] },
          date: [{ startDate: '2026-10-18T03:04:05.678Z' }],
          attachment: {
            type: 'and',
            attachment: [
              { filename: { type: 'middle', value: '보고서' }, ext: 'pdf' },
              { ext: 'PDF' },
            ],
          },
        },
      },
      { type: 'and', postRule: { newsletter: true } },
    ];
    expect(
      validateRule(ruleSchema.parse(JSON.parse(JSON.stringify(rule)))),
    ).toEqual(rule);
  });
  it('모든 메일은 빈 배열로 표현하고 빈 조건 그룹은 거절한다', () => {
    expect(validateRule([])).toEqual([]);
    expect(() =>
      validateRule([{ type: 'and', postRule: { newsletter: 'all' } }]),
    ).toThrow();
  });
  it('빈 검색어와 빈 첨부 조건을 거절한다', () => {
    expect(() =>
      validateRule([
        {
          type: 'and',
          postRule: {
            newsletter: 'all',
            subject: { type: 'and', regexp: [{ type: 'middle', value: ' ' }] },
          },
        },
      ]),
    ).toThrow();
    expect(() =>
      validateRule([
        {
          type: 'and',
          postRule: {
            newsletter: 'all',
            attachment: { type: 'and', attachment: [{}] },
          },
        },
      ]),
    ).toThrow();
  });
  it('역전된 날짜 범위를 거절한다', () => {
    expect(() =>
      validateRule([
        {
          type: 'and',
          postRule: {
            newsletter: 'all',
            date: [
              {
                startDate: '2026-10-19T00:00:00Z',
                endDate: '2026-10-18T23:59:59Z',
              },
            ],
          },
        },
      ]),
    ).toThrow();
  });
  it('날짜는 현지 자정부터 다음 날 직전까지 포함한다', () => {
    const start = new Date(dateBoundary('2026-10-18', false) ?? '');
    const end = new Date(dateBoundary('2026-10-18', true) ?? '');
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([
      0, 0, 0,
    ]);
    expect([
      end.getHours(),
      end.getMinutes(),
      end.getSeconds(),
      end.getMilliseconds(),
    ]).toEqual([23, 59, 59, 999]);
    expect(start.getDate()).toBe(end.getDate());
  });
});
