import userQuery from '@/query/user';
import domainQuery from '@/query/domain';
import { HttpStatus } from '@/controller/const';
import { getAccessUserId } from '@/controller/utils';
import type { Request, Response } from 'express';
import type { ResponseSchema } from '@/payload/response';
import database from '@/database';
import { sessions, users } from '@/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { clearAuthCookies } from '../utils';
import { sha256 } from '@/utils/hash';
import { HttpError } from '../errors';
const fields = {
  id: users.id,
  name: users.name,
  email: users.userEmail,
  provider: users.provider,
  createdAt: users.createdAt,
};
export const me = async (req: Request, res: Response<ResponseSchema>) => {
  const user = await userQuery.id.execute({ id: getAccessUserId(req) });
  if (!user) throw new HttpError(HttpStatus.NOT_FOUND, 'User not found');
  res
    .status(HttpStatus.OK)
    .json({
      status: 'ok',
      data: {
        id: user.id,
        name: user.name,
        email: user.userEmail,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });
};
export const updateMe = async (req: Request, res: Response<ResponseSchema>) => {
  const { name } = z
    .object({ name: z.string().trim().min(2).max(8) })
    .parse(req.body);
  const [user] = await database
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, getAccessUserId(req)))
    .returning(fields);
  res.status(HttpStatus.OK).json({ status: 'ok', data: user });
};
export const deleteMe = async (req: Request, res: Response<ResponseSchema>) => {
  z.object({ confirm: z.literal(true) }).parse(req.body);
  await database.delete(users).where(eq(users.id, getAccessUserId(req)));
  clearAuthCookies(res);
  res.status(HttpStatus.OK).json({ status: 'ok' });
};
export const logout = async (req: Request, res: Response<ResponseSchema>) => {
  const cookies = z
    .object({ refreshToken: z.string().optional() })
    .parse(req.cookies);
  if (cookies.refreshToken)
    await database
      .update(sessions)
      .set({ revoke: true })
      .where(eq(sessions.refreshHash, sha256(cookies.refreshToken)));
  clearAuthCookies(res);
  res.status(HttpStatus.OK).json({ status: 'ok' });
};
export const listDomains = async (
  req: Request,
  res: Response<ResponseSchema>,
) => {
  res.status(HttpStatus.OK).json({
    status: 'ok',
    data: await domainQuery.all.execute(),
  });
};
