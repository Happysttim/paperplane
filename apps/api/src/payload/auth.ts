import { z } from 'zod';

const provider = z.enum(['local', 'google', 'naver'], {
  error: '비정상적인 제공자입니다.',
});
const email = z.email({ error: '이메일을 입력해야 합니다.' }).max(254);
const password = z
  .string({
    error: '비밀번호를 입력해야 합니다.',
  })
  .min(8, {
    error: '8자 이상 입력해야 합니다.',
  })
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/, {
    error: '1개 이상의 특수문자를 포함해야 합니다.',
  });
const providerId = z.string({ error: 'provider id 가 유효하지 않습니다.' });
const name = z
  .string({ error: '이름이 유효하지 않습니다.' })
  .min(2, { error: '최소 2글자 이상이어야 합니다.' })
  .max(8, { error: '최대 8글자여야 합니다.' });

const emailBodySchema = z.object({
  type: z.union([z.literal('register'), z.literal('password')]),
  email,
});

const codeBodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

const loginBodySchema = z.object({
  email,
  password,
});

const resetPasswordBodySchema = z
  .object({
    password,
    passwordConfirm: password,
  })
  .refine((data) => data.password.trim() === data.passwordConfirm.trim(), {
    path: ['passwordConfirm'],
    error: 'password 가 동일하지 않습니다.',
  });

const registerProviderBodySchema = z.object({
  provider: provider.extract(['google', 'naver']),
  providerId,
  name,
});

const registerLocalBodySchema = z
  .object({
    provider: provider.extract(['local']),
    email,
    password,
    passwordConfirm: password,
    name,
  })
  .refine((data) => data.password.trim() === data.passwordConfirm.trim(), {
    path: ['passwordConfirm'],
    error: 'password 가 동일하지 않습니다.',
  });

const registerBodySchema = z.discriminatedUnion('provider', [
  registerProviderBodySchema,
  registerLocalBodySchema,
]);

const providerQuerySchema = z.object({
  code: z.string({ error: 'provider code 가 존재하지 않습니다.' }),
  status: z.string().optional(),
});

const verifyHeaderSchema = z.object({
  'x-paperplane-verify': z.string({ error: '검증 헤더가 존재하지 않습니다.' }),
});

const csrfHeaderSchema = z.object({
  'x-paperplane-csrf': z.string({ error: 'csrf 토큰이 존재하지 않습니다.' }),
});

const refreshCookieSchema = z.object({
  refreshToken: z.string({ error: 'refresh token 이 존재하지 않습니다.' }),
});

const sessionCookieSchema = z.object({
  sessionToken: z.string({ error: 'session token 이 존재하지 않습니다. ' }),
});

const authHeaderSchema = z.object({
  authorization: z
    .string({ error: 'Authorization 토큰이 존재하지 않습니다.' })
    .regex(/^Bearer [^\s]+$/, { error: 'Bearer token required' })
    .transform((value) => value.slice(7)),
});

export {
  emailBodySchema,
  loginBodySchema,
  resetPasswordBodySchema,
  codeBodySchema,
  registerBodySchema,
  registerLocalBodySchema,
  registerProviderBodySchema,
  providerQuerySchema,
  verifyHeaderSchema,
  csrfHeaderSchema,
  authHeaderSchema,
  refreshCookieSchema,
  sessionCookieSchema,
};
