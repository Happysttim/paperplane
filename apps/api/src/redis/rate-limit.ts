import * as redis from '.';

const RATE_LIMIT_KEY_PREFIX = 'ratelimit:';
const RATE_LIMIT_TTL_SECONDS = 60;

const combine = (key: string) => `${RATE_LIMIT_KEY_PREFIX}${key}`;

const set = async (key: string): Promise<number | null> => {
  const redisKey = combine(key);
  const count = await redis.incr(redisKey);

  if (count === null) {
    return null;
  }

  if (count === 1) {
    await redis.expire(redisKey, RATE_LIMIT_TTL_SECONDS);
  }

  return count;
};

const exists = async (key: string) => {
  return await redis.exists(combine(key));
};

const remove = async (key: string): Promise<boolean> => {
  return await redis.del(combine(key));
};

export default { set, exists, remove };
