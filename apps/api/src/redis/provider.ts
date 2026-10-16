import * as redis from '.';

type ProviderJSON = {
  provider: 'naver' | 'google';
  createdAt: number;
};
const STATE_KEY_PREFIX = 'provider:state:';
const STATE_TTL_SECONDS = 5 * 60;

const combine = (key: string) => `${STATE_KEY_PREFIX}${key}`;

const set = async (state: string, json: ProviderJSON) => {
  const key = combine(state);
  const value = JSON.stringify(json);
  return await redis.setTTL(key, value, STATE_TTL_SECONDS);
};

const exists = async (state: string) => {
  const key = combine(state);
  return await redis.exists(key);
};

const get = async (state: string): Promise<ProviderJSON | null> => {
  const key = combine(state);
  const value = await redis.get(key);

  if (value === null) {
    return null;
  }

  return JSON.parse(value) as ProviderJSON;
};

const getdel = async (state: string): Promise<ProviderJSON | null> => {
  const key = combine(state);
  const value = await redis.getdel(key);

  if (value === null) {
    return null;
  }

  return JSON.parse(value) as ProviderJSON;
};

const remove = async (state: string): Promise<boolean> => {
  const key = combine(state);
  return await redis.del(key);
};

export default { set, exists, get, getdel, remove };
