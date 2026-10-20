import { HttpStatus } from '@/controller/const';
import type { Request, Response, NextFunction } from 'express';
import type { ResponseSchema } from '@/payload/response';
import { z } from 'zod';
import { compareHmac, sha256 } from '@/utils/hash';
import { redis } from '@/redis';
import { HttpError } from '../errors';
export const internal = async (
  req: Request,
  res: Response<ResponseSchema>,
  next: NextFunction,
) => {
  const headers = z
    .object({
      'x-paperplane-timestamp': z.string().regex(/^\d{13}$/),
      'x-request-id': z.uuid(),
      'x-paperplane-signature': z.string().regex(/^[a-f0-9]{64}$/i),
    })
    .parse(req.headers);
  const timestamp = headers['x-paperplane-timestamp'];
  if (Math.abs(Date.now() - Number(timestamp)) > 300000)
    throw new HttpError(HttpStatus.UNAUTHORIZED, 'Expired signature');
  const id = headers['x-request-id'];
  const body = req.rawBody ?? '';
  const plain = [id, timestamp, sha256(body)].join('.');
  if (!compareHmac(plain, headers['x-paperplane-signature']))
    throw new HttpError(HttpStatus.UNAUTHORIZED, 'Invalid signature');
  if (
    (await redis.set('internal-request:' + id, '1', 'EX', 600, 'NX')) !== 'OK'
  )
    throw new HttpError(HttpStatus.CONFLICT, 'Request already used');
  next();
};
