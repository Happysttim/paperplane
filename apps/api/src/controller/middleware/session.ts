import { sessionCookieSchema } from '@/payload/auth';
import type { NextFunction, Request, Response } from 'express';
import jwt from '@/jwt';
import { SESSION_TOKEN } from '@/jwt/const';
import { createSessionClaims } from '@/jwt/utils';
import { injectCookie } from '../utils';

const session = (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieParse = sessionCookieSchema.safeParse(req.cookies);
    if (cookieParse.error) {
      throw new Error();
    }

    const cookie = cookieParse.data;
    const claims = jwt.verify(cookie.sessionToken);
    if (!claims) {
      throw new Error();
    }
  } catch {
    const token = createSessionClaims();
    injectCookie(res, SESSION_TOKEN, token);
  }
  next();
};

export { session };
