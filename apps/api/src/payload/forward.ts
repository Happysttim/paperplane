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
  filename: regExpValueSchema.optional(),
  ext: z.string().optional(),
});

const forwardAttachmentSchema = z.object({
  type: conditionTypeSchema,
  attachment: z.array(attachmentRuleSchema),
});

const dateRuleSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate <= value.endDate,
    { message: 'startDate must precede endDate' },
  );

const postRuleSchema = z.object({
  newsletter: z.union([z.boolean(), z.literal('all')]),
  subject: forwardRegExpSchema.optional(),
  name: forwardRegExpSchema.optional(),
  from: forwardRegExpSchema.optional(),
  date: z.array(dateRuleSchema).optional(),
  content: forwardRegExpSchema.optional(),
  attachment: forwardAttachmentSchema.optional(),
});

const forwardPostRuleSchema = z.object({
  type: conditionTypeSchema,
  postRule: postRuleSchema,
});

const forwardRuleSchema = z.array(forwardPostRuleSchema);

const forwardAddBodySchema = z.object({
  emailId: z
    .number({ error: 'email id 속성이 유효하지 않습니다.' })
    .int()
    .positive(),
  rule: forwardRuleSchema,
  dest: z.email({ error: '이메일 형태의 값이어야 합니다.' }).max(254),
});

const forwardDeleteBodySchema = z.object({
  forwardId: z
    .number({ error: 'forward id 속성이 유효하지 않습니다.' })
    .int()
    .positive(),
  emailId: z
    .number({ error: 'email id 속성이 유효하지 않습니다.' })
    .int()
    .positive(),
});

const forwardUpdateBodySchema = z
  .object({
    forwardId: z
      .number({ error: 'forward id 속성이 유효하지 않습니다.' })
      .int()
      .positive(),
    emailId: z
      .number({ error: 'email id 속성이 유효하지 않습니다.' })
      .int()
      .positive(),
    rule: forwardRuleSchema.optional(),
    dest: z
      .email({ error: '이메일 형태의 값이어야 합니다.' })
      .max(254)
      .optional(),
  })
  .refine(({ rule, dest }) => rule !== undefined || dest !== undefined, {
    error: '수정할 rule 또는 dest 속성이 필요합니다.',
  });

export {
  forwardRuleSchema,
  forwardAddBodySchema,
  forwardDeleteBodySchema,
  forwardUpdateBodySchema,
};
