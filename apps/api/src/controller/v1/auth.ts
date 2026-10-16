import { logger } from '@/logger';
import type { Request, Response } from 'express';
import { HttpStatus, ROUTE_V1_API } from '../const';
import {
  loginBodySchema,
  resetPasswordBodySchema,
  refreshCookieSchema,
  registerBodySchema,
  verifyHeaderSchema,
} from '@/payload/auth';
import userQuery from '@/query/user';
import userRepository from '@/repository/user';
import jwt from '@/jwt';
import redisVerify from '@/redis/verify';
import type { ResponseSchema } from '@/payload/response';
import { hash } from '@/utils/hash';
import { compareHash } from '@/utils/hash';
import { issueCsrfTokens, issueRefreshToken } from '../utils';
import { eq } from 'drizzle-orm';
import { users } from '@/schema';

// @Router /api/v1/auth/register POST
const register = async (req: Request, res: Response<ResponseSchema>) => {
  try {
    const headerParse = verifyHeaderSchema.safeParse(req.headers);
    if (headerParse.error) {
      throw headerParse.error;
    }

    const bodyParse = registerBodySchema.safeParse(req.body);
    if (bodyParse.error) {
      throw bodyParse.error;
    }

    const token = headerParse.data['x-paperplane-verify'];
    const body = bodyParse.data;

    const verifyClaims = jwt.verify(token);

    if (!verifyClaims || verifyClaims.type != 'verifyToken') {
      throw new Error('verify token error');
    }

    if (
      verifyClaims.claims.type === 'register' &&
      verifyClaims.claims.provider === 'local' &&
      body.provider === 'local'
    ) {
      const normalizedEmail = body.email.trim().toLowerCase();
      if (verifyClaims.claims.email.trim().toLowerCase() != normalizedEmail) {
        throw new Error('email is not confirm');
      }

      const verifyJSON = await redisVerify.getdel(token);
      if (!verifyJSON || verifyJSON.status != 'verified') {
        throw new Error('not pass verify step');
      }

      const exists = await userQuery.email.execute({
        userEmail: normalizedEmail,
      });

      if (exists) {
        return res.status(HttpStatus.CONFLICT).json({
          status: 'failed',
          error: 'email already exists',
        });
      }
    }

    const userEmail =
      body.provider === 'local' ? body.email.trim().toLowerCase() : undefined;
    const providerId = body.provider === 'local' ? undefined : body.providerId;
    const passwordHash =
      body.provider === 'local' ? await hash(body.password.trim()) : undefined;
    const user = await userRepository.create({
      provider: body.provider,
      userEmail,
      name: body.name.trim(),
      hasPremium: false,
      passwordHash,
      providerId,
    });

    if (!user) {
      logger.error(
        `${req.method} ${ROUTE_V1_API}/auth/register failed create user`,
      );
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ status: 'failed', error: 'internal server error' });
    }

    const csrfToken = issueCsrfTokens(res);
    const refreshToken = issueRefreshToken(res, user.id);

    return res.status(HttpStatus.OK).json({
      status: 'ok',
      data: {
        csrfToken,
        refreshToken,
      },
    });
  } catch (e) {
    logger.error(`${req.method} ${ROUTE_V1_API}/auth/register`, e);
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid registration request' });
  }
};

// @Router /api/v1/auth/login POST
const login = async (req: Request, res: Response<ResponseSchema>) => {
  const bodyParse = loginBodySchema.safeParse(req.body);
  if (bodyParse.error) {
    logger.error(`${req.method} ${ROUTE_V1_API}/auth/login: `, bodyParse.error);
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid input data' });
  }

  const body = bodyParse.data;
  const normalizeEmail = body.email.trim().toLowerCase();
  const user = await userQuery.email.execute({ userEmail: normalizeEmail });

  if (!user || user.passwordHash === null) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid user' });
  }

  const success = await compareHash(body.password.trim(), user.passwordHash);
  if (!success) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid user' });
  }

  const csrfToken = issueCsrfTokens(res);
  const refreshToken = issueRefreshToken(res, user.id);

  return res.status(HttpStatus.OK).json({
    status: 'ok',
    data: {
      csrfToken,
      refreshToken,
    },
  });
};

// @Router /api/v1/auth/password/reset POST
const resetPassword = async (req: Request, res: Response<ResponseSchema>) => {
  const headerParse = verifyHeaderSchema.safeParse(req.headers);
  const bodyParse = resetPasswordBodySchema.safeParse(req.body);

  if (headerParse.error || bodyParse.error) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid input data' });
  }

  const token = headerParse.data['x-paperplane-verify'];
  const verifyClaims = jwt.verify(token);

  if (
    !verifyClaims ||
    verifyClaims.type !== 'verifyToken' ||
    verifyClaims.claims.type !== 'password'
  ) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid password reset token' });
  }

  try {
    const verifyJSON = await redisVerify.getdel(token);
    if (
      !verifyJSON ||
      verifyJSON.login !== 'local' ||
      verifyJSON.status !== 'verified'
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: 'failed',
        error: 'password reset verification required',
      });
    }

    const user = await userQuery.id.execute({ id: verifyClaims.claims.id });
    if (
      !user ||
      user.provider !== 'local' ||
      user.userEmail?.trim().toLowerCase() !==
        verifyClaims.claims.email.trim().toLowerCase()
    ) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: 'failed', error: 'invalid password reset request' });
    }

    const passwordHash = await hash(bodyParse.data.password.trim());
    const updated = await userRepository.update(
      { passwordHash, updatedAt: new Date() },
      eq(users.id, user.id),
    );

    if (updated.length === 0) {
      logger.error(
        `${req.method} ${ROUTE_V1_API}/auth/password/reset failed update password`,
      );
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ status: 'failed', error: 'internal server error' });
    }

    return res.status(HttpStatus.OK).json({ status: 'ok' });
  } catch (e) {
    logger.error(`${req.method} ${ROUTE_V1_API}/auth/password/reset`, e);
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ status: 'failed', error: 'internal server error' });
  }
};

const refresh = async (req: Request, res: Response<ResponseSchema>) => {
  const cookieParse = refreshCookieSchema.safeParse(req.cookies);
  if (cookieParse.error) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/auth/refresh: `,
      cookieParse.error,
    );
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid input data' });
  }

  const refreshToken = cookieParse.data.refreshToken;
  const refreshClaims = jwt.verify(refreshToken);

  if (!refreshClaims || refreshClaims.type != 'refreshToken') {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid refresh token' });
  }

  const accessToken = await issueRefreshToken(
    res,
    refreshClaims.claims.id,
    refreshToken,
  );
  if (!accessToken) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid refresh token' });
  }

  return res.status(HttpStatus.OK).json({
    status: 'ok',
    data: {
      accessToken,
    },
  });
};

export { register, login, resetPassword, refresh };
