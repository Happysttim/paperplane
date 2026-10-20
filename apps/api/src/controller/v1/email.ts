import { HttpStatus } from '@/controller/const';
import { getAccessUserId } from '@/controller/utils';
import type { Request, Response } from 'express';
import type { ResponseSchema } from '@/payload/response';
import {
  emailAddBodySchema,
  emailDeleteBodySchema,
  emailQuerySchema,
} from '@/payload/email';
import domainQuery from '@/query/domain';
import emailQuery from '@/query/email';
import emailRepo from '@/repository/email';
import { emails } from '@/schema';
import { and, eq } from 'drizzle-orm';
import { HttpError } from '../errors';
import { isReservedEmailAddress } from '@/utils/email';

/** 예약 이름과 서비스 도메인을 확인한 뒤 사용자 수신 주소를 등록합니다. */
const addEmail = async (req: Request, res: Response<ResponseSchema>) => {
  const { src } = emailAddBodySchema.parse(req.body);
  const address = src.trim().toLowerCase();
  if (isReservedEmailAddress(address))
    throw new HttpError(HttpStatus.BAD_REQUEST, 'Reserved email address');
  const [domain] = await domainQuery.name.execute({
    name: address.split('@')[1],
  });
  if (!domain)
    throw new HttpError(HttpStatus.BAD_REQUEST, 'Unsupported email domain');
  const email = await emailRepo.create({
    src: address,
    userId: getAccessUserId(req),
    domainId: domain.id,
  });
  if (!email) throw new HttpError(HttpStatus.CONFLICT, 'Email already exists');
  res.status(HttpStatus.CREATED).json({ status: 'ok', data: email });
};
const getEmail = async (req: Request, res: Response<ResponseSchema>) => {
  const { page = 1 } = emailQuerySchema.parse(req.query);
  const userId = getAccessUserId(req);
  const rows = await emailQuery.pagination.execute({
    userId,
    offset: (page - 1) * 10,
    limit: 10,
  });
  const [total] = await emailQuery.paginationCount.execute({ userId });
  res.status(HttpStatus.OK).json({
    status: 'ok',
    data: {
      emails: rows,
      pages: Math.ceil((total?.count ?? 0) / 10),
      total: total?.count ?? 0,
      now: page,
    },
  });
};
const deleteEmail = async (req: Request, res: Response<ResponseSchema>) => {
  const { emailId } = emailDeleteBodySchema.parse(req.body);
  const deleted = await emailRepo.remove(
    and(eq(emails.id, emailId), eq(emails.userId, getAccessUserId(req))),
  );
  if (!deleted.length)
    throw new HttpError(HttpStatus.NOT_FOUND, 'Email not found');
  res.status(HttpStatus.OK).json({ status: 'ok' });
};
export default { addEmail, getEmail, deleteEmail };
