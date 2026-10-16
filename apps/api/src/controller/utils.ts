import type { TokenType } from '@/jwt/type';
import {
  createAccessClaims,
  createRefreshClaims,
  createSessionClaims,
} from '@/jwt/utils';
import jwt from '@/jwt';
import { REFRESH_TOKEN, SESSION_TOKEN } from '@/jwt/const';
import { generateHmac, sha256 } from '@/utils/hash';
import { RANDOM_HMAC_SEED } from '@/utils/const';
import type { ResponseSchema } from '@/payload/response';
import type { Response } from 'express';
import sessionQuery from '@/query/session';
import sessionRepo from '@/repository/session';
import { eq } from 'drizzle-orm';
import { sessions } from '@/schema';

const tokenExpires = (key: TokenType): Date => {
  const now = new Date();
  switch (key) {
    case 'sessionToken':
      return new Date(now.setDate(now.getDate() + 7));
    case 'accessToken':
      return new Date(now.setMinutes(now.getMinutes() + 15));
    case 'refreshToken':
      return new Date(now.setDate(now.getDate() + 1));
    case 'verifyToken':
      return new Date(now.setHours(now.getHours() + 12));
  }
};

const injectCookie = (res: Response, key: TokenType, value: string) => {
  const expires = tokenExpires(key);

  res.cookie(key, value, {
    httpOnly: true,
    secure: true,
    expires,
  });
};

const issueCsrfTokens = (res: Response<ResponseSchema>): string => {
  const sessionToken = createSessionClaims();
  const csrfToken = generateHmac(sessionToken, RANDOM_HMAC_SEED);

  injectCookie(res, SESSION_TOKEN, sessionToken);

  return csrfToken;
};

const issueRefreshToken = async (
  res: Response<ResponseSchema>,
  userId: number,
  before?: string,
): Promise<string | undefined> => {
  try {
    if (before) {
      const refreshClaims = jwt.verify(before);
      if (!refreshClaims || refreshClaims.type != 'refreshToken') {
        return undefined;
      }

      const refreshHash = sha256(before);
      const session = await sessionQuery.findSession.execute({
        refreshHash,
        revoke: false,
      });

      if (session) {
        session.revoke = true;
        const updated = await sessionRepo.update(
          session,
          eq(sessions.id, session.id),
        );
        if (updated.length === 0) {
          return undefined;
        }
      }
    }

    const accessToken = createAccessClaims(userId);
    const refreshToken = createRefreshClaims(userId);

    const refreshHash = sha256(refreshToken);
    const created = await sessionRepo.create({
      refreshHash,
      expiresAt: tokenExpires(REFRESH_TOKEN),
    });

    if (!created) {
      return undefined;
    }

    injectCookie(res, REFRESH_TOKEN, refreshToken);

    return accessToken;
  } catch {
    return undefined;
  }
};

export { injectCookie, issueCsrfTokens, issueRefreshToken };
