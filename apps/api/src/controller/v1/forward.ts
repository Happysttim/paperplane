import domainQuery from '@/query/domain';
import destinationQuery from '@/query/destination';
import emailQuery from '@/query/email';
import { HttpStatus } from '@/controller/const';
import { getAccessUserId } from '@/controller/utils';
import type { Request, Response } from 'express';
import type { ResponseSchema } from '@/payload/response';
import {
  forwardAddBodySchema,
  forwardDeleteBodySchema,
  forwardUpdateBodySchema,
  forwardRuleSchema,
} from '@/payload/forward';
import { routeEmailBodySchema } from '@/payload/route';
import database from '@/database';
import { forwards } from '@/schema';
import { and, eq } from 'drizzle-orm';
import { HttpError } from '../errors';
import { matchForwardRule } from '@/schema/rules';
import { toPostRecord } from './router';
import { z } from 'zod';
export const validateDestination = async (address: string, userId: number) => {
  const domain = address.split('@')[1]!;
  const local = await domainQuery.name.execute({ name: domain });
  if (local.length)
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      'Forwarding to a service domain is not allowed',
    );
  const verified = await destinationQuery.verified.execute({ address, userId });
  if (!verified.length)
    throw new HttpError(
      HttpStatus.BAD_REQUEST,
      'Destination verification required',
    );
};
const ownedEmail = async (emailId: number, userId: number) => {
  const email = await emailQuery.forwardsWithId.execute({
    id: emailId,
    userId,
  });
  if (!email) throw new HttpError(HttpStatus.NOT_FOUND, 'Email not found');
};
const postRule = async (req: Request, res: Response<ResponseSchema>) => {
  const { emailId, rule, dest } = forwardAddBodySchema.parse(req.body);
  const userId = getAccessUserId(req);
  await ownedEmail(emailId, userId);
  const address = dest.trim().toLowerCase();
  await validateDestination(address, userId);
  const [forward] = await database
    .insert(forwards)
    .values({ emailId, rule, dest: address })
    .returning();
  res.status(HttpStatus.CREATED).json({ status: 'ok', data: forward });
};
const updateRule = async (req: Request, res: Response<ResponseSchema>) => {
  const { emailId, forwardId, rule, dest } = forwardUpdateBodySchema.parse(
    req.body,
  );
  const userId = getAccessUserId(req);
  await ownedEmail(emailId, userId);
  const address = dest?.trim().toLowerCase();
  if (address) await validateDestination(address, userId);
  const [forward] = await database
    .update(forwards)
    .set({ rule, dest: address, updated_at: new Date() })
    .where(and(eq(forwards.id, forwardId), eq(forwards.emailId, emailId)))
    .returning();
  if (!forward) throw new HttpError(HttpStatus.NOT_FOUND, 'Forward not found');
  res.status(HttpStatus.OK).json({ status: 'ok', data: forward });
};
const deleteForwards = async (req: Request, res: Response<ResponseSchema>) => {
  const { emailId, forwardId } = forwardDeleteBodySchema.parse(req.body);
  await ownedEmail(emailId, getAccessUserId(req));
  const removed = await database
    .delete(forwards)
    .where(and(eq(forwards.id, forwardId), eq(forwards.emailId, emailId)))
    .returning();
  if (!removed.length)
    throw new HttpError(HttpStatus.NOT_FOUND, 'Forward not found');
  res.status(HttpStatus.OK).json({ status: 'ok' });
};
const testRule = (req: Request, res: Response<ResponseSchema>) => {
  const { rule, mail } = z
    .object({ rule: forwardRuleSchema, mail: routeEmailBodySchema })
    .parse(req.body);
  const record = toPostRecord(mail);
  res.status(HttpStatus.OK).json({
    status: 'ok',
    data: {
      matches: matchForwardRule(record, rule),
      groups: rule.map((group) => matchForwardRule(record, [group])),
      record,
    },
  });
};
export default { postRule, updateRule, deleteForwards, testRule };
