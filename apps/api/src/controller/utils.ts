import type { TokenType } from '@/jwt/type';
import {
  createAccessClaims,
  createRefreshClaims,
  createSessionClaims,
} from '@/jwt/utils';
import jwt from '@/jwt';
import { generateHmac, sha256 } from '@/utils/hash';
import type { CookieOptions, Request, Response } from 'express';
import { authHeaderSchema } from '@/payload/auth';
import { HttpStatus } from './const';
import { HttpError } from './errors';
import database from '@/database';
import { and, eq, gt } from 'drizzle-orm';
import { sessions } from '@/schema';
import config from '@/config';
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: 'lax',
  path: '/',
};
export const injectCookie = (res: Response, key: TokenType, value: string) => {
  res.cookie(key, value, {
    ...cookieOptions,
    maxAge: key === 'sessionToken' ? 7 * 86400000 : 86400000,
  });
};
export const clearAuthCookies = (res: Response) => {
  for (const key of ['sessionToken', 'refreshToken'])
    res.clearCookie(key, cookieOptions);
};
export const issueCsrfTokens = (res: Response): string => {
  const sessionToken = createSessionClaims();
  injectCookie(res, 'sessionToken', sessionToken);
  return generateHmac(sessionToken);
};
export const issueRefreshToken = async (
  res: Response,
  userId: number,
  before?: string,
): Promise<string | undefined> => {
  const refreshToken = createRefreshClaims(userId);
  const created = await database.transaction(async (tx) => {
    if (before) {
      const claims = jwt.verify(before);
      if (claims?.type !== 'refreshToken' || claims.claims.id !== userId)
        return undefined;
      const revoked = await tx
        .update(sessions)
        .set({ revoke: true })
        .where(
          and(
            eq(sessions.refreshHash, sha256(before)),
            eq(sessions.userId, userId),
            eq(sessions.revoke, false),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .returning();
      if (revoked.length !== 1) return undefined;
    }
    const [session] = await tx
      .insert(sessions)
      .values({
        userId,
        refreshHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + 86400000),
      })
      .returning();
    return session;
  });
  if (!created) return undefined;
  injectCookie(res, 'refreshToken', refreshToken);
  return createAccessClaims(userId);
};

// Controllers obtain the user identity; authorization only gates the request.
export const getAccessUserId = (req: Request): number => {
  const header = authHeaderSchema.safeParse(req.headers);
  const token = header.success
    ? jwt.verify(header.data.authorization)
    : undefined;
  if (token?.type !== 'accessToken') {
    throw new HttpError(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }
  return token.claims.id;
};
