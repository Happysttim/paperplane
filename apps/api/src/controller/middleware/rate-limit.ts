import rateLimitStore from '@/redis/rate-limit';
import type { ResponseSchema } from '@/payload/response';
import type { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '../const';

const RATE_LIMIT_TTL_SECONDS = 60;

const rateLimit = (limit: number) => {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('rate limit must be a positive integer');
  }

  return async (
    req: Request,
    res: Response<ResponseSchema>,
    next: NextFunction,
  ) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const count = await rateLimitStore.set(ip);

    if (count === null) {
      res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ status: 'failed', error: 'rate limit unavailable' });
      return;
    }

    if (count > limit) {
      res.setHeader('Retry-After', RATE_LIMIT_TTL_SECONDS);
      res
        .status(HttpStatus.TOO_MANY_REQUESTS)
        .json({ status: 'failed', error: 'too many requests' });
      return;
    }

    next();
  };
};

export { rateLimit };
