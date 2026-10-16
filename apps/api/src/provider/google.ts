import config from '@/config';
import { OAuth } from '@/controller/const';
import { logger } from '@/logger';
import { googleTokenSchema, googleUserInfoSchema } from '@/payload/provider';

import type { z } from 'zod';
import qs from 'querystring';

type GoogleTokenInfer = z.infer<typeof googleTokenSchema>;
type GoogleUserInfoInfer = z.infer<typeof googleUserInfoSchema>;

const token = async (code: string): Promise<GoogleTokenInfer | undefined> => {
  const body = {
    grant_type: 'authorization_code',
    client_id: config.provider.google.id,
    client_secret: config.provider.google.secret,
    redirect_uri: config.provider.google.redirectURI,
    code,
  };
  const response = await fetch(OAuth.Token.GOOGLE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: qs.stringify(body),
  });

  if (!response.ok) {
    logger.error(`google token request is failed`);
    return undefined;
  }

  const tokenParse = googleTokenSchema.safeParse(await response.json());
  if (tokenParse.error) {
    logger.error(`google token request is failed: ${tokenParse.error}`);
    return undefined;
  }

  return tokenParse.data;
};

const user = async (
  tokenType: string,
  accessToken: string,
): Promise<GoogleUserInfoInfer | undefined> => {
  const response = await fetch(OAuth.Userinfo.GOOGLE, {
    headers: { Authorization: `${tokenType} ${accessToken}` },
  });

  if (!response.ok) {
    logger.error('google userinfo request is failed');
    return undefined;
  }

  const userParse = googleUserInfoSchema.safeParse(await response.json());
  if (userParse.error) {
    logger.error(`google userinfo request is failed: ${userParse.error}`);
    return undefined;
  }

  return userParse.data;
};

export { token, user };
