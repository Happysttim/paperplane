import { describe, expect, it } from 'vitest';
import {
  matchForwardRule,
  type PostRecord,
  type PostRule,
} from '../src/schema/rules';

const mail: PostRecord = {
  newsletter: false,
  subject: 'Project offer',
  name: 'Alice',
  from: 'alice@example.com',
  content: 'Please review the proposal',
  date: '2026-10-18T12:00:00Z',
  attachment: ['Proposal.PDF'],
};

describe('typed forwarding conditions', () => {
  const textCases: Array<{
    key: 'subject' | 'name' | 'from' | 'content';
    value: string;
  }> = [
    { key: 'subject', value: 'PROJECT' },
    { key: 'name', value: 'alice' },
    { key: 'from', value: '@example.com' },
    { key: 'content', value: 'proposal' },
  ];
  it.each(textCases)(
    'matches $key without coercing other fields',
    ({ key, value }) => {
      const postRule: PostRule = {
        newsletter: 'all',
        [key]: { type: 'and', regexp: [{ type: 'middle', value }] },
      };
      expect(matchForwardRule(mail, [{ type: 'and', postRule }])).toBe(true);
      expect(
        matchForwardRule({ ...mail, [key]: 'unrelated' }, [
          { type: 'and', postRule },
        ]),
      ).toBe(false);
    },
  );
  it('combines date, attachment and newsletter conditions with AND/OR', () => {
    const postRule: PostRule = {
      newsletter: false,
      date: [
        { startDate: '2026-10-18T00:00:00Z', endDate: '2026-10-19T00:00:00Z' },
      ],
      attachment: {
        type: 'and',
        attachment: [
          { filename: { type: 'prefix', value: 'proposal' }, ext: '.pdf' },
        ],
      },
    };
    expect(matchForwardRule(mail, [{ type: 'and', postRule }])).toBe(true);
    expect(
      matchForwardRule({ ...mail, attachment: [] }, [
        { type: 'and', postRule },
      ]),
    ).toBe(false);
    expect(
      matchForwardRule({ ...mail, date: 'invalid' }, [
        { type: 'and', postRule },
      ]),
    ).toBe(false);
    expect(
      matchForwardRule({ ...mail, attachment: [] }, [{ type: 'or', postRule }]),
    ).toBe(true);
  });
  it('ignores unrestricted and empty conditions and combines groups with OR', () => {
    expect(matchForwardRule(mail, [])).toBe(true);
    expect(
      matchForwardRule(mail, [
        { type: 'and', postRule: { newsletter: 'all', date: [] } },
      ]),
    ).toBe(true);
    expect(
      matchForwardRule(mail, [
        { type: 'and', postRule: { newsletter: true } },
        { type: 'and', postRule: { newsletter: false } },
      ]),
    ).toBe(true);
  });
});
