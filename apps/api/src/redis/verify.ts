import type { ProviderUserInfoInfer } from '@/payload/provider';
import * as redis from '.';

export type VerifyStatus = 'verify' | 'verified';
export type VerifyJSON =
  | {
      login: 'oauth';
      status: 'verified';
      provider: ProviderUserInfoInfer;
    }
  | {
      login: 'local';
      status: VerifyStatus;
      code: string;
    };
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

  return JSON.parse(value) as VerifyJSON;
};

const getdel = async (verifyToken: string): Promise<VerifyJSON | null> => {
  const key = combine(verifyToken);
  const value = await redis.getdel(key);

  if (value === null) {
    return null;
  }

  return JSON.parse(value) as VerifyJSON;
};

const remove = async (verifyToken: string): Promise<boolean> => {
  const key = combine(verifyToken);
  return await redis.del(key);
};

export default { set, exists, get, getdel, remove };
