import * as redis from '.';

const EMAIL_KEY_PREFIX = 'email:';
const EMAIL_TTL_SECONDS = 30;

const combine = (email: string) => `${EMAIL_KEY_PREFIX}${email}`;

const set = async (email: string): Promise<boolean> => {
  const key = combine(email);
  return await redis.setTTL(key, '1', EMAIL_TTL_SECONDS);
};

const exists = async (email: string) => {
  return await redis.exists(combine(email));
};

const remove = async (email: string): Promise<boolean> => {
  return await redis.del(combine(email));
};

const ttl = async (email: string): Promise<number | null> => {
  const key = combine(email);
  const count = await redis.ttl(key);

  if (count === null) {
    return null;
  }

  return count;
};

export default { set, exists, remove, ttl };
