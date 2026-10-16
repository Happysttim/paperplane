import config from '@/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JWTClaims, StringValue } from './type';
import jwt from 'jsonwebtoken';
import { logger } from '@/logger';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const privateKey = await fs.readFile(
  path.resolve(root, config.jwtPrivateKeyPath),
  {
    encoding: 'utf-8',
  },
);
const publicKey = await fs.readFile(
  path.resolve(root, config.jwtPublicKeyPath),
  {
    encoding: 'utf-8',
  },
);

const sign = (claims: JWTClaims, expiresIn?: StringValue | number) => {
  return jwt.sign(claims, privateKey, { algorithm: 'RS256', expiresIn });
};

const verify = (token: string) => {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as JWTClaims;
    if (!decoded || !decoded.exp) {
      return undefined;
    }

    return decoded;
  } catch (e) {
    logger.error('unknown token error ', e);
    return undefined;
  }
};

export default { sign, verify };
