import { z } from 'zod';

const baseClaimsSchema = z.object({ id: z.number().int().positive() });
const sessionClaimsSchema = z.object({ uuid: z.uuid() });
const verifyClaimsSchema = z.union([
  z.object({
    type: z.literal('register'),
    provider: z.literal('local'),
    email: z.email(),
  }),
  z.object({
    type: z.literal('register'),
    provider: z.enum(['google', 'naver']),
    providerId: z.string(),
  }),
  z.object({
    type: z.literal('password'),
    id: z.number().int().positive(),
    email: z.email(),
  }),
]);
export const jwtClaimsSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('accessToken'), claims: baseClaimsSchema }),
    z.object({ type: z.literal('refreshToken'), claims: baseClaimsSchema }),
    z.object({ type: z.literal('verifyToken'), claims: verifyClaimsSchema }),
    z.object({ type: z.literal('sessionToken'), claims: sessionClaimsSchema }),
  ])
  .and(
    z.object({
      jti: z.string().optional(),
      iat: z.number().optional(),
      exp: z.number().optional(),
    }),
  );
export type JWTClaims = z.infer<typeof jwtClaimsSchema>;
export type TokenType = JWTClaims['type'];
export type BaseClaims = z.infer<typeof baseClaimsSchema>;
export type SessionClaims = z.infer<typeof sessionClaimsSchema>;
export type VerifyClaims = z.infer<typeof verifyClaimsSchema>;

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
