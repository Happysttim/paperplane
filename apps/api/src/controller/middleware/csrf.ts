import { csrfHeaderSchema, sessionCookieSchema } from '@/payload/auth';
import type { ResponseSchema } from '@/payload/response';
import type { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '../const';
import jwt from '@/jwt';
import { compareHmac } from '@/utils/hash';

const verify = (
  req: Request,
  res: Response<ResponseSchema>,
  next: NextFunction,
) => {
  const cookieParse = sessionCookieSchema.safeParse(req.cookies);
  if (cookieParse.error) {
    res
      .status(HttpStatus.UNAUTHORIZED)
      .send({ status: 'failed', error: 'unauthorized' });
    return;
  }
  const cookie = cookieParse.data;
  const sessionClaims = jwt.verify(cookie.sessionToken);
  if (!sessionClaims || sessionClaims.type != 'sessionToken') {
    res
      .status(HttpStatus.UNAUTHORIZED)
      .send({ status: 'failed', error: 'unauthorized' });
    return;
  }

  const headerParse = csrfHeaderSchema.safeParse(req.headers);
  if (headerParse.error) {
    res
      .status(HttpStatus.UNAUTHORIZED)
      .send({ status: 'failed', error: 'unauthorized' });
    return;
  }
  const csrf = headerParse.data['x-paperplane-csrf'];
  if (!compareHmac(cookie.sessionToken, csrf)) {
    res
      .status(HttpStatus.UNAUTHORIZED)
      .send({ status: 'failed', error: 'unauthorized' });
    return;
  }

  next();
};

export { verify };
