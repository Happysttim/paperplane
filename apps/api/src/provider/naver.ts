import config from '@/config';
import { OAuth } from '@/controller/const';
import { logger } from '@/logger';
import { naverTokenSchema, naverUserInfoSchema } from '@/payload/provider';

import type { z } from 'zod';

type NaverTokenInfer = z.infer<typeof naverTokenSchema>;
type NaverUserInfoInfer = z.infer<typeof naverUserInfoSchema>;

const token = async (
  code: string,
  state: string,
): Promise<NaverTokenInfer | undefined> => {
  const body = {
    grant_type: 'authorization_code',
    client_id: config.provider.naver.id,
    client_secret: config.provider.naver.secret,
    redirect_uri: config.provider.naver.redirectURI,
    code,
    state,
  };
  const response = await fetch(
    `${OAuth.Token.NAVER}?${new URLSearchParams(body)}`,
    {
      headers: {
        'X-Naver-Client-Id': config.provider.naver.id,
        'X-Naver-Client-Secret': config.provider.naver.secret,
      },
    },
  );

  if (!response.ok) {
    logger.error(`naver token request is failed`);
    return undefined;
  }

  const tokenParse = naverTokenSchema.safeParse(await response.json());
  if (tokenParse.error) {
    logger.error(`naver token request is failed: ${tokenParse.error}`);
    return undefined;
  }

  return tokenParse.data;
};

const user = async (
  tokenType: string,
  accessToken: string,
): Promise<NaverUserInfoInfer | undefined> => {
  const response = await fetch(OAuth.Userinfo.NAVER, {
    headers: { Authorization: `${tokenType} ${accessToken}` },
  });

  if (!response.ok) {
    logger.error('naver userinfo request is failed');
    return undefined;
  }

  const userParse = naverUserInfoSchema.safeParse(await response.json());
  if (userParse.error) {
    logger.error(`naver userinfo request is failed: ${userParse.error}`);
    return undefined;
  }

  return userParse.data;
};

export { token, user };
