import { HttpStatus } from '@/controller/const';
import { getAccessUserId } from '@/controller/utils';
import type { Request, Response } from 'express';
import type { ResponseSchema } from '@/payload/response';
import { z } from 'zod';
import database from '@/database';
import { deliveries } from '@/schema';
import deliveryQuery from '@/query/delivery';
import { HttpError } from '../errors';
export const record = async (req: Request, res: Response<ResponseSchema>) => {
  const body = z
    .object({
      eventId: z.uuid(),
      source: z.email().transform((value) => value.toLowerCase()),
      destination: z
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      messageId: z.string().min(1).max(255),
      status: z.enum(['sent', 'failed', 'retrying']),
      detail: z.string().max(500).optional(),
    })
    .parse(req.body);
  const [route] = await deliveryQuery.route.execute({
    source: body.source,
    destination: body.destination,
  });
  if (!route) throw new HttpError(HttpStatus.NOT_FOUND, 'Route not found');
  const values = {
    eventId: body.eventId,
    emailId: route.emailId,
    destination: body.destination,
    messageId: body.messageId,
    status: body.status,
    detail: body.detail,
  };
  const [created] = await database
    .insert(deliveries)
    .values(values)
    .onConflictDoNothing()
    .returning();
  if (!created) {
    const [existing] = await deliveryQuery.event.execute({
      eventId: body.eventId,
    });
    if (
      !existing ||
      existing.emailId !== values.emailId ||
      existing.destination !== values.destination ||
      existing.messageId !== values.messageId ||
      existing.status !== values.status ||
      existing.detail !== (values.detail ?? null)
    )
      throw new HttpError(HttpStatus.CONFLICT, 'Event ID conflict');
    res.status(HttpStatus.OK).json({ status: 'ok', data: existing });
    return;
  }
  res.status(HttpStatus.CREATED).json({ status: 'ok', data: created });
};
export const list = async (req: Request, res: Response<ResponseSchema>) => {
  const { page } = z
    .object({ page: z.coerce.number().int().positive().max(100000).default(1) })
    .parse(req.query);
  const userId = getAccessUserId(req);
  const data = await deliveryQuery.pagination.execute({
    userId,
    limit: 20,
    offset: (page - 1) * 20,
  });
  const [total] = await deliveryQuery.paginationCount.execute({ userId });
  res.status(HttpStatus.OK).json({
    status: 'ok',
    data: { deliveries: data, total: total?.count ?? 0, page },
  });
};
