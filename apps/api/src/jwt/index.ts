import config from '@/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { jwtClaimsSchema, type JWTClaims, type StringValue } from './type';
import jwt from 'jsonwebtoken';
import { logger } from '@/logger';

const root = process.cwd();
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
    });
    const parsed = jwtClaimsSchema.safeParse(decoded);
    if (!parsed.success || !parsed.data.exp) {
      return undefined;
    }

    return parsed.data;
  } catch (e) {
    logger.error('unknown token error ', e);
    return undefined;
  }
};

export default { sign, verify };
