import { z } from 'zod';

const emailAddBodySchema = z.object({
  src: z.email({ error: '이메일 형식의 값이어야 합니다.' }),
});

const emailQuerySchema = z.object({
  page: z.number({ error: 'page 속성이 유효하지 않습니다.' }).optional(),
});

const emailDeleteBodySchema = z.object({
  emailId: z.number({ error: 'email id 속성이 유효하지 않습니다.' }),
});

export { emailAddBodySchema, emailQuerySchema, emailDeleteBodySchema };
