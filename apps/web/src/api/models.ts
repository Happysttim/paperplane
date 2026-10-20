import { z } from 'zod';

export const emailInput = z
  .email('올바른 이메일 주소를 입력해 주세요.')
  .max(254);
export const nameInput = z
  .string()
  .trim()
  .min(2, '이름은 2~8자로 입력해 주세요.')
  .max(8, '이름은 2~8자로 입력해 주세요.');
export const passwordInput = z
  .string()
  .trim()
  .min(8, '비밀번호는 8자 이상이어야 해요.')
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    '특수문자를 하나 이상 포함해 주세요.',
  );
export const termSchema = z.object({
  type: z.enum(['middle', 'prefix', 'suffix']),
  value: z.string(),
});
export const textRuleSchema = z.object({
  type: z.enum(['and', 'or']),
  regexp: z.array(termSchema),
});
export const dateRuleSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export const attachmentSchema = z.object({
  filename: termSchema.optional(),
  ext: z.string().optional(),
});
export const groupSchema = z.object({
  type: z.enum(['and', 'or']),
  postRule: z.object({
    newsletter: z.union([z.boolean(), z.literal('all')]),
    subject: textRuleSchema.optional(),
    name: textRuleSchema.optional(),
    from: textRuleSchema.optional(),
    content: textRuleSchema.optional(),
    date: z.array(dateRuleSchema).optional(),
    attachment: z
      .object({
        type: z.enum(['and', 'or']),
        attachment: z.array(attachmentSchema),
      })
      .optional(),
  }),
});
export const ruleSchema = z.array(groupSchema);
export type Rule = z.infer<typeof ruleSchema>;
export type RuleGroup = z.infer<typeof groupSchema>;
export type TextRule = z.infer<typeof textRuleSchema>;
export type Term = z.infer<typeof termSchema>;
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  provider: z.enum(['local', 'google', 'naver']),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;
export const forwardSchema = z.object({
  id: z.number(),
  emailId: z.number(),
  dest: z.string(),
  rule: ruleSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Forward = z.infer<typeof forwardSchema>;
export const emailSchema = z.object({
  id: z.number(),
  userId: z.number(),
  src: z.string(),
  domainId: z.number(),
  created_at: z.string(),
});
export const emailDetailSchema = emailSchema.extend({
  forwards: z.array(forwardSchema),
  totalForwards: z.number(),
});
export type EmailAddress = z.infer<typeof emailDetailSchema>;
export const emailPageSchema = z.object({
  emails: z.array(emailDetailSchema),
  pages: z.number(),
  total: z.number(),
  now: z.number(),
});
export const domainSchema = z.object({ id: z.number(), name: z.string() });
export const destinationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  address: z.string(),
  verifiedAt: z.string(),
});
export type Destination = z.infer<typeof destinationSchema>;
export const deliverySchema = z.object({
  id: z.number(),
  eventId: z.string(),
  emailId: z.number(),
  destination: z.string(),
  messageId: z.string(),
  status: z.enum(['sent', 'failed', 'retrying']),
  detail: z.string().nullable(),
  createdAt: z.string(),
});
export const deliveryPageSchema = z.object({
  deliveries: z.array(
    z.object({ delivery: deliverySchema, source: z.string() }),
  ),
  total: z.number(),
  page: z.number(),
});
export const tokensSchema = z.object({
  accessToken: z.string(),
  csrfToken: z.string(),
});
export const verifyTokenSchema = z.object({ verifyToken: z.string() });
export const challengeSchema = z.object({
  verificationToken: z.string(),
  expiresIn: z.number(),
});
export const mailSchema = z.object({
  headers: z.array(z.object({ key: z.string(), value: z.string() })),
  envelope: z.object({
    from: z.string(),
    recipients: z.array(emailInput).min(1),
  }),
  from: z.object({ name: z.string(), address: emailInput }),
  subject: z.string(),
  date: z.iso.datetime(),
  content: z.string(),
  attachments: z.array(
    z.object({
      filename: z.string(),
      contentType: z.string(),
      size: z.number(),
    }),
  ),
  contentSize: z.number().int().nonnegative(),
});
export type Mail = z.infer<typeof mailSchema>;
export const testResultSchema = z.object({
  matches: z.boolean(),
  groups: z.array(z.boolean()),
  record: z.unknown(),
});
export type TestResult = z.infer<typeof testResultSchema>;
