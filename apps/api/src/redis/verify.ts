import { providerUserInfoSchema } from '@/payload/provider';
import { z } from 'zod';
import * as redis from '.';

const verifyJSONSchema = z.discriminatedUnion('login', [
  z.object({
    login: z.literal('oauth'),
    status: z.literal('verified'),
    provider: providerUserInfoSchema,
  }),
  z.object({
    login: z.literal('local'),
    status: z.enum(['verify', 'verified']),
    code: z.string(),
  }),
]);
export type VerifyJSON = z.infer<typeof verifyJSONSchema>;
export type VerifyStatus = VerifyJSON['status'];
const VERIFY_KEY_PREFIX = 'verify:';
const VERIFY_TTL_SECONDS = 30 * 60;

const combine = (verifyToken: string) => `${VERIFY_KEY_PREFIX}${verifyToken}`;

const set = async (verifyToken: string, json: VerifyJSON) => {
  const key = combine(verifyToken);
  const value = JSON.stringify(json);
  return await redis.setTTL(key, value, VERIFY_TTL_SECONDS);
};

const exists = async (verifyToken: string) => {
  const key = combine(verifyToken);
  return await redis.exists(key);
};

const get = async (verifyToken: string): Promise<VerifyJSON | null> => {
  const key = combine(verifyToken);
  const value = await redis.get(key);

  if (value === null) {
    return null;
  }

  return verifyJSONSchema.parse(JSON.parse(value));
};

const getdel = async (verifyToken: string): Promise<VerifyJSON | null> => {
  const key = combine(verifyToken);
  const value = await redis.getdel(key);

  if (value === null) {
    return null;
  }

  return verifyJSONSchema.parse(JSON.parse(value));
};

const remove = async (verifyToken: string): Promise<boolean> => {
  const key = combine(verifyToken);
  return await redis.del(key);
};

export default { set, exists, get, getdel, remove };
