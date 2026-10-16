import { z } from 'zod';

const conditionTypeSchema = z.union([z.literal('and'), z.literal('or')]);

const regExpValueSchema = z.object({
  type: z.union([
    z.literal('middle'),
    z.literal('prefix'),
    z.literal('suffix'),
  ]),
  value: z.string(),
});

const forwardRegExpSchema = z.object({
  type: conditionTypeSchema,
  regexp: z.array(regExpValueSchema),
});

const attachmentRuleSchema = z.object({
  filename: z.union([regExpValueSchema, z.undefined()]),
  ext: z.union([z.string(), z.undefined()]),
});

const forwardAttachmentSchema = z.object({
  type: conditionTypeSchema,
  attachment: z.array(attachmentRuleSchema),
});

const dateRuleSchema = z.object({
  startDate: z.union([z.coerce.date(), z.undefined()]),
  endDate: z.union([z.coerce.date(), z.undefined()]),
});

const postRuleSchema = z.object({
  newsletter: z.union([z.boolean(), z.literal('all')]),
  subject: z.union([forwardRegExpSchema, z.undefined()]),
  name: z.union([forwardRegExpSchema, z.undefined()]),
  from: z.union([forwardRegExpSchema, z.undefined()]),
  date: z.union([z.array(dateRuleSchema), z.undefined()]),
  content: z.union([forwardRegExpSchema, z.undefined()]),
  attachment: z.union([forwardAttachmentSchema, z.undefined()]),
});

const forwardPostRuleSchema = z.object({
  type: conditionTypeSchema,
  postRule: postRuleSchema,
});

const forwardRuleSchema = z.array(forwardPostRuleSchema);

const forwardAddBodySchema = z.object({
  emailId: z.number({ error: 'email id 속성이 유효하지 않습니다.' }),
  rule: forwardRuleSchema,
  dest: z.email({ error: '이메일 형태의 값이어야 합니다.' }),
});

const forwardDeleteBodySchema = z.object({
  forwardId: z.number({ error: 'forward id 속성이 유효하지 않습니다.' }),
  emailId: z.number({ error: 'email id 속성이 유효하지 않습니다.' }),
});

const forwardUpdateBodySchema = z.object({
  forwardId: z.number({ error: 'forward id 속성이 유효하지 않습니다.' }),
  emailId: z.number({ error: 'email id 속성이 유효하지 않습니다.' }),
  rule: forwardRuleSchema.optional(),
  dest: z.email({ error: '이메일 형태의 값이어야 합니다.' }).optional(),
}).refine(({ rule, dest }) => rule !== undefined || dest !== undefined, {
  error: '수정할 rule 또는 dest 속성이 필요합니다.',
});

export {
  forwardAddBodySchema,
  forwardDeleteBodySchema,
  forwardUpdateBodySchema,
};
