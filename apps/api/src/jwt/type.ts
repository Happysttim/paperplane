export type TokenType =
  'accessToken' | 'refreshToken' | 'verifyToken' | 'sessionToken';
export type BaseClaims = {
  id: number;
};

export type SessionClaims = {
  uuid: string;
};

export type VerifyClaims =
  | {
      type: 'register';
      provider: 'local';
      email: string;
    }
  | {
      type: 'register';
      provider: 'google' | 'naver';
      providerId: string;
    }
  | {
      type: 'password';
      id: number;
      email: string;
    };

export type JWTClaims = {
  iat?: number;
  exp?: number;
} & (
  | {
      type: 'accessToken';
      claims: BaseClaims;
    }
  | {
      type: 'refreshToken';
      claims: BaseClaims;
    }
  | {
      type: 'verifyToken';
      claims: VerifyClaims;
    }
  | {
      type: 'sessionToken';
      claims: SessionClaims;
    }
);

type Unit =
  | 'Years'
  | 'Year'
  | 'Yrs'
  | 'Yr'
  | 'Y'
  | 'Weeks'
  | 'Week'
  | 'W'
  | 'Days'
  | 'Day'
  | 'D'
  | 'Hours'
  | 'Hour'
  | 'Hrs'
  | 'Hr'
  | 'H'
  | 'Minutes'
  | 'Minute'
  | 'Mins'
  | 'Min'
  | 'M'
  | 'Seconds'
  | 'Second'
  | 'Secs'
  | 'Sec'
  | 's'
  | 'Milliseconds'
  | 'Millisecond'
  | 'Msecs'
  | 'Msec'
  | 'Ms';

type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;

export type StringValue =
  `${number}` | `${number}${UnitAnyCase}` | `${number} ${UnitAnyCase}`;
