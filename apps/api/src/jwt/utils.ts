import { randomUUID } from 'crypto';
import type { JWTClaims, VerifyClaims } from './type';
import jwt from '.';

const createSessionClaims = (): string => {
  const jwtClaims: JWTClaims = {
    type: 'sessionToken',
    claims: {
      uuid: randomUUID(),
    },
  };

  return jwt.sign(jwtClaims);
};

const createAccessClaims = (id: number): string => {
  const jwtClaims: JWTClaims = {
    type: 'accessToken',
    claims: {
      id,
    },
  };

  return jwt.sign(jwtClaims, '15 minutes');
};

const createRefreshClaims = (id: number): string => {
  const jwtClaims: JWTClaims = {
    type: 'refreshToken',
    claims: {
      id,
    },
  };

  return jwt.sign(jwtClaims, '1 day');
};

const createVerifyClaims = (verifyClaims: VerifyClaims): string => {
  const jwtClaims: JWTClaims = {
    type: 'verifyToken',
    claims: verifyClaims,
  };

  return jwt.sign(jwtClaims, '12 hours');
};

export {
  createSessionClaims,
  createAccessClaims,
  createRefreshClaims,
  createVerifyClaims,
};
