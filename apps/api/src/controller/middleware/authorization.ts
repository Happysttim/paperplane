import { authHeaderSchema } from '@/payload/auth';
import type { ResponseSchema } from '@/payload/response';
import type { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '../const';
import jwt from '@/jwt';

const verify = (
  req: Request,
  res: Response<ResponseSchema>,
  next: NextFunction,
) => {
  const headerParse = authHeaderSchema.safeParse(req.headers);
  if (headerParse.error) {
    res
      .status(HttpStatus.UNAUTHORIZED)
      .send({ status: 'failed', error: 'unauthorized' });
    return;
  }
  const token = headerParse.data.authorization;
  const accessClaims = jwt.verify(token);

  if (!accessClaims || accessClaims.type != 'accessToken') {
    res
      .status(HttpStatus.UNAUTHORIZED)
      .send({ status: 'failed', error: 'unauthorized' });
    return;
  }

  next();
};

export { verify };
