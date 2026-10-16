import config from '@/config';
import { logger } from '@/logger';
import { Redis } from 'ioredis';

const redis = new Redis({
  host: config.redis.address,
  port: config.redis.port,
  username: config.redis.user,
  password: config.redis.password,
  db: config.redis.db,
});

const set = async (key: string, value: string): Promise<boolean> => {
  try {
    const ok = await redis.set(key, value);
    return ok === 'OK';
  } catch (e) {
    logger.error('redis set error ', e);
    return false;
  }
};

const setTTL = async (
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> => {
  try {
    const ok = await redis.set(key, value, 'EX', ttlSeconds);
    return ok === 'OK';
  } catch (e) {
    logger.error('redis set with ttl error ', e);
    return false;
  }
};

const incr = async (key: string): Promise<number | null> => {
  try {
    return await redis.incr(key);
  } catch (e) {
    logger.error('redis increment error ', e);
    return null;
  }
};

const expire = async (key: string, ttlSeconds: number): Promise<boolean> => {
  try {
    return (await redis.expire(key, ttlSeconds)) === 1;
  } catch (e) {
    logger.error('redis expire error ', e);
    return false;
  }
};

const getdel = async (key: string): Promise<string | null> => {
  try {
    const result = await redis.getdel(key);
    return result;
  } catch (e) {
    logger.error('redis getdel error ', e);
    return null;
  }
};

const exists = async (key: string): Promise<boolean> => {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (e) {
    logger.error('redis exists error ', e);
    return false;
  }
};

const get = async (key: string): Promise<string | null> => {
  try {
    const result = await redis.get(key);
    return result;
  } catch (e) {
    logger.error('redis exists error ', e);
    return null;
  }
};

const del = async (key: string): Promise<boolean> => {
  try {
    const result = await redis.del(key);
    return result === 1;
  } catch (e) {
    logger.error('redis exists error ', e);
    return false;
  }
};

const ttl = async (key: string): Promise<number | null> => {
  try {
    return await redis.ttl(key);
  } catch (e) {
    logger.error('redis ttl error ', e);
    return null;
  }
};

export { set, setTTL, incr, expire, getdel, exists, get, del, ttl };
