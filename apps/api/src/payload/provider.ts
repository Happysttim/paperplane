import { z } from 'zod';

const providerCallbackSchema = z.union([
  z.object({
    provider: z.literal('naver'),
    error: z.undefined(),
    code: z.string(),
    state: z.string(),
  }),
  z.object({
    provider: z.literal('naver'),
    error: z.string(),
    error_description: z.string(),
  }),
  z.object({
    provider: z.literal('google'),
    error: z.undefined(),
    code: z.string(),
  }),
  z.object({
    provider: z.literal('google'),
    error: z.string(),
  }),
]);

const naverTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

const googleTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.array(z.string()),
});

const providerTokenSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('naver'),
    ...naverTokenSchema.shape,
  }),
  z.object({
    provider: z.literal('google'),
    ...googleTokenSchema.shape,
  }),
]);

const naverUserInfoSchema = z.object({
  resultcode: z.string(),
  message: z.string(),
  response: z.object({
    id: z.string(),
  }),
});

const googleUserInfoSchema = z.object({
  sub: z.string(),
});

const providerUserInfoSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('naver'),
    ...naverUserInfoSchema.shape,
  }),
  z.object({
    provider: z.literal('google'),
    ...googleUserInfoSchema.shape,
  }),
]);

const providerAuthBodySchema = z.object({
  provider: z.union([z.literal('naver'), z.literal('google')]),
});

type ProviderCallbackInfer = z.infer<typeof providerCallbackSchema>;
type ProviderTokenInfer = z.infer<typeof providerTokenSchema>;
type ProviderUserInfoInfer = z.infer<typeof providerUserInfoSchema>;

export {
  naverTokenSchema,
  googleTokenSchema,
  naverUserInfoSchema,
  googleUserInfoSchema,
  providerCallbackSchema,
  providerTokenSchema,
  providerUserInfoSchema,
  providerAuthBodySchema,
  type ProviderCallbackInfer,
  type ProviderTokenInfer,
  type ProviderUserInfoInfer,
};
