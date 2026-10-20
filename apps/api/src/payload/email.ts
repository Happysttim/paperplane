import { z } from 'zod';

const emailAddBodySchema = z.object({
  src: z.email({ error: '이메일 형식의 값이어야 합니다.' }).max(254),
});

const emailQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100000).optional(),
});

const emailDeleteBodySchema = z.object({
  emailId: z
    .number({ error: 'email id 속성이 유효하지 않습니다.' })
    .int()
    .positive(),
});

export { emailAddBodySchema, emailQuerySchema, emailDeleteBodySchema };
