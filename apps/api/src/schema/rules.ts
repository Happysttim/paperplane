export type ConditionType = 'and' | 'or';
export type RegExpValue = {
  type: 'middle' | 'prefix' | 'suffix';
  value: string;
};

export type ForwardRegExp = {
  type: ConditionType;
  regexp: RegExpValue[];
};

export type AttachmentRule = {
  filename: RegExpValue | undefined;
  ext: string | undefined;
};

export type ForwardAttachment = {
  type: ConditionType;
  attachment: AttachmentRule[];
};

export type PostRule = {
  newsletter: boolean | 'all';
  subject: ForwardRegExp | undefined;
  from: ForwardRegExp | undefined;
  to: ForwardRegExp | undefined;
  content: ForwardRegExp | undefined;
  attachment: ForwardAttachment | undefined;
};
export type ForwardPostRule = {
  type: ConditionType;
  postRule: PostRule;
};
export type PostRuleKey = keyof PostRule;
export type PostRecord = Record<PostRuleKey, string | string[] | boolean>;
export type ForwardRule = ForwardPostRule[];

const arrayOf = <T extends boolean | string | string[]>(t: T): string[] =>
  Array.isArray(t) ? t : [t.toString()];
const matchRegExpValue = (value: string, regexp: RegExpValue) => {
  switch (regexp.type) {
    case 'middle':
      return value.toLowerCase().includes(regexp.value.toLowerCase());
    case 'prefix':
      return value.toLowerCase().startsWith(regexp.value.toLowerCase());
    case 'suffix':
      return value.toLowerCase().endsWith(regexp.value.toLowerCase());
  }
};

const matchForwardRegExp = (value: string, rule: ForwardRegExp) => {
  const matches = rule.regexp.map((regexp) => matchRegExpValue(value, regexp));
  if (matches.length === 0) return true;
  return rule.type === 'and' ? matches.every(Boolean) : matches.some(Boolean);
};

const matchAttachment = (attachment: string, rule: AttachmentRule) => {
  const lastIndex = attachment.lastIndexOf('.');
  let filename = '',
    ext = '';
  if (lastIndex == -1) {
    filename = attachment;
  } else {
    filename = attachment.slice(0, lastIndex);
    ext = attachment.slice(lastIndex + 1).toLowerCase();
  }

  const matchFilename = rule.filename
    ? matchRegExpValue(filename, rule.filename)
    : true;
  const matchExt = rule.ext
    ? ext.trim().includes(rule.ext.toLowerCase())
    : true;
  return matchFilename && matchExt;
};

const matchForwardAttachment = (
  attachment: string,
  rule: ForwardAttachment,
) => {
  const matches = rule.attachment.map((rule) =>
    matchAttachment(attachment, rule),
  );
  if (matches.length === 0) return true;
  return rule.type === 'and' ? matches.every(Boolean) : matches.some(Boolean);
};

const matchForwardAttachments = (
  attachments: string[],
  rule: ForwardAttachment,
) => {
  return attachments.some((attachment) =>
    matchForwardAttachment(attachment, rule),
  );
};

const matchPost = (record: PostRecord, rule: ForwardPostRule) => {
  const keys = Object.keys(record) as PostRuleKey[];
  const result = keys.flatMap((key: PostRuleKey) => {
    const postProp = rule.postRule[key];
    if (postProp === undefined) return [];
    if (
      (typeof postProp === 'boolean' || typeof postProp === 'string') &&
      typeof record[key] === 'boolean'
    ) {
      if (postProp === 'all') {
        return [];
      }
      return rule.postRule[key] === record[key];
    } else if (typeof postProp === 'object' && key === 'attachment') {
      const forwardAttachment = postProp as ForwardAttachment;
      return matchForwardAttachments(arrayOf(record[key]), forwardAttachment);
    } else {
      const forwardRegExp = postProp as ForwardRegExp;
      return matchForwardRegExp(record[key] as string, forwardRegExp);
    }
  });
  if (result.length === 0) return true;
  return rule.type === 'and' ? result.every(Boolean) : result.some(Boolean);
};

const matchForwardRule = (record: PostRecord, rules: ForwardRule) => {
  return rules.some((rule) => matchPost(record, rule));
};

export default {
  matchForwardRule,
};
