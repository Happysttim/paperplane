import { HttpStatus } from '@/controller/const';
import type { Request, Response } from 'express';
import type { ResponseSchema } from '@/payload/response';
import { randomBytes, randomInt } from 'node:crypto';
import {
  type ProviderUserInfoInfer,
  providerAuthBodySchema,
  providerCallbackSchema,
} from '@/payload/provider';
import {
  codeBodySchema,
  emailBodySchema,
  sessionCookieSchema,
  verifyHeaderSchema,
} from '@/payload/auth';
import { google, naver } from '@/provider';
import { OAuth } from '../const';
import config from '@/config';
import redisProvider from '@/redis/provider';
import redisVerify from '@/redis/verify';
import { redis } from '@/redis';
import { createVerifyClaims } from '@/jwt/utils';
import jwt from '@/jwt';
import { sha256 } from '@/utils/hash';
import userQuery from '@/query/user';
import { sendVerifyMail } from '@/mailer';
import { HttpError } from '../errors';
import { issueCsrfTokens, issueRefreshToken } from '../utils';
export const oauth = async (req: Request, res: Response<ResponseSchema>) => {
  const { provider } = providerAuthBodySchema.parse(req.query);
  const session = sessionCookieSchema.parse(req.cookies).sessionToken;
  const state = randomBytes(32).toString('hex');
  if (
    !(await redisProvider.set(state, {
      provider,
      createdAt: Date.now(),
      session: sha256(session),
    }))
  )
    throw new HttpError(HttpStatus.SERVICE_UNAVAILABLE, 'OAuth unavailable');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.provider[provider].id,
    redirect_uri: config.provider[provider].redirectURI,
    state,
  });
  if (provider === 'google') params.set('scope', 'openid');
  const base =
    provider === 'google'
      ? OAuth.Authorization.GOOGLE
      : OAuth.Authorization.NAVER;
  res.status(HttpStatus.OK).json({
    status: 'ok',
    data: { authorization: base + '?' + params.toString() },
  });
};
export const provider = async (req: Request, res: Response<ResponseSchema>) => {
  const body = providerCallbackSchema.parse(req.body);
  if (body.error !== undefined)
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      'OAuth provider rejected authorization',
    );
  const state = await redisProvider.getdel(body.state);
  const session = sessionCookieSchema.parse(req.cookies).sessionToken;
  if (
    !state ||
    state.provider !== body.provider ||
    state.session !== sha256(session)
  )
    throw new HttpError(HttpStatus.BAD_REQUEST, 'Invalid OAuth state');
  let providerId: string;
  let info: ProviderUserInfoInfer;
  if (body.provider === 'naver') {
    const token = await naver.token(body.code, body.state);
    const user = token
      ? await naver.user(token.token_type, token.access_token)
      : undefined;
    if (!user)
      throw new HttpError(HttpStatus.BAD_REQUEST, 'OAuth verification failed');
    providerId = user.response.id;
    info = { provider: 'naver', ...user };
  } else {
    const token = await google.token(body.code);
    const user = token
      ? await google.user(token.token_type, token.access_token)
      : undefined;
    if (!user)
      throw new HttpError(HttpStatus.BAD_REQUEST, 'OAuth verification failed');
    providerId = user.sub;
    info = { provider: 'google', ...user };
  }
  const exists = await userQuery.providerId.execute({
    providerId,
    provider: body.provider,
  });
  if (exists) {
    const accessToken = await issueRefreshToken(res, exists.id);
    if (!accessToken)
      throw new HttpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'Session creation failed',
      );
    res.status(HttpStatus.OK).json({
      status: 'ok',
      data: { accessToken, csrfToken: issueCsrfTokens(res) },
    });
    return;
  }
  const verifyToken = createVerifyClaims({
    type: 'register',
    provider: body.provider,
    providerId,
  });
  if (
    !(await redisVerify.set(verifyToken, {
      login: 'oauth',
      status: 'verified',
      provider: info,
    }))
  )
    throw new HttpError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'Verification unavailable',
    );
  res
    .status(HttpStatus.OK)
    .json({ status: 'ok', data: { verifyToken, providerId } });
};
export const email = async (req: Request, res: Response<ResponseSchema>) => {
  const body = emailBodySchema.parse(req.body);
  const address = body.email.trim().toLowerCase();
  let token: string;
  if (body.type === 'register')
    token = createVerifyClaims({
      type: 'register',
      provider: 'local',
      email: address,
    });
  else {
    const user = await userQuery.email.execute({ userEmail: address });
    if (!user || user.provider !== 'local')
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        'Invalid verification request',
      );
    token = createVerifyClaims({
      type: 'password',
      id: user.id,
      email: address,
    });
  }
  const cooldown = 'email:' + address;
  if ((await redis.set(cooldown, '1', 'EX', 30, 'NX')) !== 'OK') {
    res.setHeader('Retry-After', Math.max(0, await redis.ttl(cooldown)));
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      status: 'failed',
      error: 'Wait before requesting another email',
    });
    return;
  }
  const code = randomInt(1000000).toString().padStart(6, '0');
  if (
    !(await sendVerifyMail(address, {
      title: '[Paperplane] 이메일 인증',
      verifyCode: code,
    }))
  ) {
    await redis.del(cooldown);
    throw new HttpError(HttpStatus.BAD_GATEWAY, 'Email delivery failed');
  }
  if (
    !(await redisVerify.set(token, { login: 'local', status: 'verify', code }))
  )
    throw new HttpError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'Verification unavailable',
    );
  res
    .status(HttpStatus.CREATED)
    .json({ status: 'ok', data: { verifyToken: token } });
};
export const codeVerify = async (
  req: Request,
  res: Response<ResponseSchema>,
) => {
  const token = verifyHeaderSchema.parse(req.headers)['x-paperplane-verify'];
  const { code } = codeBodySchema.parse(req.body);
  const claims = jwt.verify(token);
  if (claims?.type !== 'verifyToken')
    throw new HttpError(HttpStatus.BAD_REQUEST, 'Invalid verification');
  const attemptsKey = 'verify-attempts:' + sha256(token);
  const attempts = Number(
    await redis.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 1800) end; return n",
      1,
      attemptsKey,
    ),
  );
  if (attempts > 5)
    throw new HttpError(
      HttpStatus.TOO_MANY_REQUESTS,
      'Too many verification attempts',
    );
  const verified = await redisVerify.get(token);
  if (!verified || verified.login !== 'local' || verified.code !== code)
    throw new HttpError(HttpStatus.BAD_REQUEST, 'Invalid verification code');
  if (!(await redisVerify.set(token, { ...verified, status: 'verified' })))
    throw new HttpError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'Verification unavailable',
    );
  res.status(HttpStatus.OK).json({ status: 'ok' });
};
