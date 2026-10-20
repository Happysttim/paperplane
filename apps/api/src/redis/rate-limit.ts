import { redis } from '.';
const set = async (key: string): Promise<number | null> => {
  try {
    return Number(
      await redis.eval(
        "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 60) end; return n",
        1,
        'ratelimit:' + key,
      ),
    );
  } catch {
    return null;
  }
};
export default { set };
