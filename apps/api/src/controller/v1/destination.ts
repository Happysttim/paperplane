import domainQuery from '@/query/domain';
import destinationQuery from '@/query/destination';
import { HttpStatus } from '@/controller/const';
import { getAccessUserId } from '@/controller/utils';
import type { Request, Response } from 'express';
import type { ResponseSchema } from '@/payload/response';
import { randomBytes, randomInt } from 'node:crypto';
import { z } from 'zod';
import { redis } from '@/redis';
import { sha256 } from '@/utils/hash';
import { sendVerifyMail } from '@/mailer';
import database from '@/database';
import { destinations, emails, forwards } from '@/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { HttpError } from '../errors';
const challengeSchema = z.object({
  userId: z.number(),
  address: z.email(),
  codeHash: z.string(),
});
export const requestVerification = async (
  req: Request,
  res: Response<ResponseSchema>,
) => {
  const { address } = z
    .object({
      address: z
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
    })
    .parse(req.body);
  const userId = getAccessUserId(req);
  const local = await domainQuery.name.execute({ name: address.split('@')[1] });
  if (local.length)
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      'Destination must be outside service domains',
    );
  const cooldown = 'destination-cooldown:' + userId + ':' + address;
  if ((await redis.set(cooldown, '1', 'EX', 60, 'NX')) !== 'OK')
    throw new HttpError(
      HttpStatus.TOO_MANY_REQUESTS,
      'Wait before requesting another code',
    );
  const token = randomBytes(32).toString('hex');
  const code = randomInt(1000000).toString().padStart(6, '0');
  if (
    !(await sendVerifyMail(address, {
      title: '[Paperplane] 전달 목적지 인증',
      verifyCode: code,
    }))
  )
    throw new HttpError(HttpStatus.BAD_GATEWAY, 'Verification email failed');
  await redis.set(
    'destination:' + sha256(token),
    JSON.stringify({ userId, address, codeHash: sha256(code) }),
    'EX',
    600,
  );
  res
    .status(HttpStatus.CREATED)
    .json({ status: 'ok', data: { verificationToken: token, expiresIn: 600 } });
};
export const confirm = async (req: Request, res: Response<ResponseSchema>) => {
  const { verificationToken, code } = z
    .object({
      verificationToken: z.string().regex(/^[a-f0-9]{64}$/),
      code: z.string().regex(/^\d{6}$/),
    })
    .parse(req.body);
  const key = 'destination:' + sha256(verificationToken);
  // A challenge permits one confirmation attempt; a wrong code requires a new challenge.
  const raw = await redis.getdel(key);
  const data = raw ? challengeSchema.parse(JSON.parse(raw)) : undefined;
  if (
    !data ||
    data.userId !== getAccessUserId(req) ||
    data.codeHash !== sha256(code)
  )
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      'Invalid or expired verification',
    );
  const [destination] = await database
    .insert(destinations)
    .values({ userId: data.userId, address: data.address })
    .onConflictDoUpdate({
      target: [destinations.userId, destinations.address],
      set: { verifiedAt: new Date() },
    })
    .returning();
  res.status(HttpStatus.OK).json({ status: 'ok', data: destination });
};
export const list = async (req: Request, res: Response<ResponseSchema>) => {
  res.status(HttpStatus.OK).json({
    status: 'ok',
    data: await destinationQuery.all.execute({ userId: getAccessUserId(req) }),
  });
};
export const remove = async (req: Request, res: Response<ResponseSchema>) => {
  const { destinationId } = z
    .object({ destinationId: z.number().int().positive() })
    .parse(req.body);
  await database.transaction(async (tx) => {
    const [destination] = await tx
      .delete(destinations)
      .where(
        and(
          eq(destinations.id, destinationId),
          eq(destinations.userId, getAccessUserId(req)),
        ),
      )
      .returning();
    if (!destination)
      throw new HttpError(HttpStatus.NOT_FOUND, 'Destination not found');
    const owned = tx
      .select({ id: emails.id })
      .from(emails)
      .where(eq(emails.userId, destination.userId));
    await tx
      .delete(forwards)
      .where(
        and(
          eq(forwards.dest, destination.address),
          inArray(forwards.emailId, owned),
        ),
      );
  });
  res.status(HttpStatus.OK).json({ status: 'ok' });
};
