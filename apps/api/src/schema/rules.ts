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
  filename?: RegExpValue;
  ext?: string;
};

export type DateRule = {
  startDate?: Date | string;
  endDate?: Date | string;
};

export type ForwardAttachment = {
  type: ConditionType;
  attachment: AttachmentRule[];
};

export type PostRule = {
  newsletter: boolean | 'all';
  subject?: ForwardRegExp;
  name?: ForwardRegExp;
  from?: ForwardRegExp;
  date?: DateRule[];
  content?: ForwardRegExp;
  attachment?: ForwardAttachment;
};
export type ForwardPostRule = {
  type: ConditionType;
  postRule: PostRule;
};
export type PostRuleKey = keyof PostRule;
export type PostRecord = {
  newsletter: boolean;
  subject: string;
  name: string;
  from: string;
  date: string | Date;
  content: string;
  attachment: string[];
};
export type ForwardRule = ForwardPostRule[];

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
    ? ext.trim() === rule.ext.toLowerCase().replace(/^\./, '')
    : true;
  return matchFilename && matchExt;
};

const matchDate = (date: Date | string, rule: DateRule) => {
  const target = new Date(date);
  const start = rule.startDate ? new Date(rule.startDate) : undefined;
  const end = rule.endDate ? new Date(rule.endDate) : undefined;

  if (Number.isNaN(target.getTime())) return false;

  if (start && end) {
    return start <= target && target <= end;
  }

  if (start) {
    return start <= target;
  }

  if (end) {
    return target <= end;
  }

  return true;
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
  const post = rule.postRule;
  const result: boolean[] = [];
  if (post.newsletter !== 'all')
    result.push(post.newsletter === record.newsletter);
  if (post.attachment)
    result.push(matchForwardAttachments(record.attachment, post.attachment));
  if (post.date?.length)
    result.push(post.date.some((date) => matchDate(record.date, date)));
  const textKeys: Array<'subject' | 'name' | 'from' | 'content'> = [
    'subject',
    'name',
    'from',
    'content',
  ];
  for (const key of textKeys) {
    const condition = post[key];
    if (condition) result.push(matchForwardRegExp(record[key], condition));
  }
  if (result.length === 0) return true;
  return rule.type === 'and' ? result.every(Boolean) : result.some(Boolean);
};

export const matchForwardRule = (record: PostRecord, rules: ForwardRule) => {
  return rules.length === 0 || rules.some((rule) => matchPost(record, rule));
};
