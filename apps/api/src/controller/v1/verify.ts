import { logger } from '@/logger';
import {
  providerCallbackSchema,
  providerAuthBodySchema,
  type ProviderCallbackInfer,
  type ProviderUserInfoInfer,
} from '@/payload/provider';
import type { ResponseSchema } from '@/payload/response';
import type { Request, Response } from 'express';
import { HttpStatus, OAuth, ROUTE_V1_API } from '../const';
import { google, naver } from '@/provider';
import redisVerify from '@/redis/verify';
import redisProvider from '@/redis/provider';
import redisEmail from '@/redis/email';
import jwt from '@/jwt';
import userQuery from '@/query/user';
import { createVerifyClaims } from '@/jwt/utils';
import { issueCsrfTokens, issueRefreshToken } from '../utils';
import config from '@/config';
import { randomBytes, randomInt } from 'node:crypto';
import {
  codeBodySchema,
  emailBodySchema,
  verifyHeaderSchema,
} from '@/payload/auth';
import { sendVerifyMail } from '@/mailer';
import type { z } from 'zod';

type EmailBodyInfer = z.infer<typeof emailBodySchema>;

// @Router /api/v1/verify/provider POST
const provider = async (req: Request, res: Response<ResponseSchema>) => {
  const bodyParse = providerCallbackSchema.safeParse(req.body);
  if (bodyParse.error) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/provider `,
      bodyParse.error.cause,
    );
    return res.status(HttpStatus.BAD_REQUEST).json({ status: 'failed' });
  }

  const body = bodyParse.data;
  if (body.error !== undefined) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/provider callback error`,
      body.error,
    );
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'callback error' });
  }

  if (body.provider === 'naver') {
    const rresult = await redisProvider.getdel(body.state);
    if (!rresult) {
      logger.error(
        `${req.method} ${ROUTE_V1_API}/verify/provider state invalid error`,
        body.error,
      );
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: 'failed', error: 'state invalid error' });
    }
  }

  const info = await userinfo(req.method, body);
  if (!info) {
    return res.status(HttpStatus.BAD_REQUEST).json({ status: 'failed' });
  }

  const providerId = info.provider === 'naver' ? info.response.id : info.sub;

  const exists = await userQuery.providerId.execute({
    providerId,
    provider: info.provider,
  });

  if (exists) {
    const csrfToken = issueCsrfTokens(res);
    const accessToken = await issueRefreshToken(res, exists.id);
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      data: {
        csrfToken,
        accessToken,
      },
    });
  }

  const token = createVerifyClaims({
    provider: info.provider,
    providerId,
    type: 'register',
  });

  const result = await redisVerify.set(token, {
    login: 'oauth',
    status: 'verified',
    provider: info,
  });

  if (!result) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/provider redis save error`,
      body.error,
    );
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'token save error' });
  }

  return res.status(HttpStatus.OK).json({
    status: 'ok',
    data: {
      verifyToken: token,
    },
  });
};

// @Router /api/v1/verify/oauth [GET]
const oauth = async (req: Request, res: Response<ResponseSchema>) => {
  const providerParse = providerAuthBodySchema.safeParse(req.query);
  if (providerParse.error) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid provider' });
  }
  const { provider } = providerParse.data;

  const state = randomBytes(32).toString('hex');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.provider[provider].id,
    redirect_uri: config.provider[provider].redirectURI,
    state,
  });

  if (provider === 'google') {
    params.set('scope', 'openid');
  }

  const authorizationBase =
    provider === 'naver'
      ? OAuth.Authorization.NAVER
      : OAuth.Authorization.GOOGLE;

  if (provider === 'naver') {
    const rresult = await redisProvider.set(state, {
      provider: 'naver',
      createdAt: Date.now(),
    });
    if (!rresult) {
      logger.error('failed save naver provider state');
    }
  }

  return res.status(HttpStatus.OK).json({
    status: 'ok',
    data: {
      authorization: `${authorizationBase}?${params.toString()}`,
    },
  });
};

// @Router /api/v1/verify/email [POST]
const email = async (req: Request, res: Response<ResponseSchema>) => {
  const bodyParse = emailBodySchema.safeParse(req.body);

  if (bodyParse.error) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid email' });
  }

  const body = bodyParse.data;
  const normalizeEmail = body.email.trim().toLowerCase();

  const ttl = await redisEmail.ttl(normalizeEmail);
  if (ttl === null) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/email redis query error`,
    );
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ status: 'failed', error: 'internal server error' });
  }

  if (ttl > 0) {
    return res.status(HttpStatus.OK).json({ status: 'ok', data: { ttl } });
  }

  const code = randomInt(0, 1000000).toString().padStart(6, '0');
  const mailer = await sendVerifyMail(body.email.trim(), {
    title: '[PAPERPLANE] 이메일 인증 메일 입니다.',
    verifyCode: code,
  });

  if (!mailer) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/email email(${body.email.trim()}) send error`,
    );

    return res
      .status(HttpStatus.CONFLICT)
      .json({ status: 'failed', error: 'retry to send mail' });
  }

  const token = await localVerifyClaims(body);
  if (!token) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/email token invalid error`,
    );
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'bad request' });
  }

  const vresult = await redisVerify.set(token, {
    login: 'local',
    status: 'verify',
    code,
  });

  if (!vresult) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/email failed to save verify redis`,
    );
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ status: 'failed', error: 'internal server error' });
  }

  const tresult = await redisEmail.set(normalizeEmail);
  if (!tresult) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/email failed to save email redis`,
    );
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ status: 'failed', error: 'internal server error' });
  }

  return res
    .status(HttpStatus.CREATED)
    .json({ status: 'ok', data: { verifyToken: token } });
};

// @Router /api/v1/verify/code [POST]
const codeVerify = async (req: Request, res: Response<ResponseSchema>) => {
  try {
    const headerParse = verifyHeaderSchema.safeParse(req.headers);
    if (headerParse.error) {
      throw headerParse.error;
    }
    const bodyParse = codeBodySchema.safeParse(req.body);
    if (bodyParse.error) {
      throw bodyParse.error;
    }
    const token = headerParse.data['x-paperplane-verify'];
    const body = bodyParse.data;

    const verifyClaims = jwt.verify(token);

    if (!verifyClaims || verifyClaims.type != 'verifyToken') {
      throw new Error('verify token error');
    }

    const rval = await redisVerify.get(token);
    if (
      !rval ||
      rval.login !== 'local' ||
      rval.code.trim() !== body.code.trim()
    ) {
      throw new Error('verify token error');
    }

    const vresult = await redisVerify.set(token, {
      code: rval.code,
      login: 'local',
      status: 'verified',
    });

    if (!vresult) {
      throw new Error('failed to save redis verified token');
    }

    return res.status(HttpStatus.OK).json({ status: 'ok' });
  } catch (e) {
    logger.error(
      `${req.method} ${ROUTE_V1_API}/verify/code failed verify code`,
      e,
    );
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'invalid code error' });
  }
};

const userinfo = async (
  method: string,
  body: ProviderCallbackInfer,
): Promise<ProviderUserInfoInfer | undefined> => {
  if (body.error !== undefined) {
    logger.error(
      `${method} ${ROUTE_V1_API}/verify/provider callback error`,
      body.error,
    );
    return undefined;
  }
  if (body.provider === 'naver') {
    const token = await naver.token(body.code, body.state);
    if (!token) {
      logger.error(
        `${method} ${ROUTE_V1_API}/verify/provider naver token is undefined`,
        body.error,
      );
      return undefined;
    }
    const info = await naver.user(token.token_type, token.access_token);
    if (!info) {
      logger.error(
        `${method} ${ROUTE_V1_API}/verify/provider naver userinfo is undefined`,
        body.error,
      );
      return undefined;
    }
    return {
      provider: 'naver',
      ...info,
    };
  } else {
    const token = await google.token(body.code);
    if (!token) {
      logger.error(
        `${method} ${ROUTE_V1_API}/verify/provider google token is undefined`,
        body.error,
      );
      return undefined;
    }
    const info = await google.user(token.token_type, token.access_token);
    if (!info) {
      logger.error(
        `${method} ${ROUTE_V1_API}/verify/provider google userinfo is undefined`,
        body.error,
      );
      return undefined;
    }
    return {
      provider: 'google',
      ...info,
    };
  }
};

const localVerifyClaims = async (
  body: EmailBodyInfer,
): Promise<string | undefined> => {
  if (body.type === 'register') {
    return createVerifyClaims({
      type: 'register',
      provider: 'local',
      email: body.email.trim(),
    });
  }

  const exists = await userQuery.email.execute({
    userEmail: body.email.trim().toLowerCase(),
  });

  if (!exists) {
    return undefined;
  }

  return createVerifyClaims({
    type: 'password',
    email: body.email.trim(),
    id: exists.id,
  });
};

export { provider, oauth, codeVerify, email };
