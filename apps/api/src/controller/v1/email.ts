import { authHeaderSchema } from '@/payload/auth';
import {
  emailAddBodySchema,
  emailDeleteBodySchema,
  emailQuerySchema,
} from '@/payload/email';
import type { ResponseSchema } from '@/payload/response';
import type { Request, Response } from 'express';
import { HttpStatus } from '../const';
import jwt from '@/jwt';
import userQuery from '@/query/user';
import emailRepo from '@/repository/email';
import domainQuery from '@/query/domain';
import emailQuery from '@/query/email';
import { and, eq } from 'drizzle-orm';
import { emails } from '@/schema';

// @Router /api/v1/email POST
const addEmail = async (req: Request, res: Response<ResponseSchema>) => {
  const bodyParse = emailAddBodySchema.safeParse(req.body);
  const headerParse = authHeaderSchema.safeParse(req.headers);

  if (headerParse.error) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  if (bodyParse.error) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'invalid input data',
    });
  }

  const token = headerParse.data.authorization;
  const accessClaims = jwt.verify(token);

  if (!accessClaims || accessClaims.type != 'accessToken') {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  const { src } = bodyParse.data;
  const user = await userQuery.id.execute({ id: accessClaims.claims.id });
  const domain = await domainQuery.first.execute();

  if (!domain) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'failed',
      error: 'Internal server error',
    });
  }

  if (!user) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  try {
    const email = await emailRepo.create({
      userId: user.id,
      src,
      domainId: domain.id,
    });

    if (!email) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'failed',
        error: 'Internal server error',
      });
    }

    return res.status(HttpStatus.CREATED).json({
      status: 'ok',
      data: {
        src: email.src,
      },
    });
  } catch {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'failed',
      error: 'Internal server error',
    });
  }
};

// @Router /api/v1/email?page={number} GET
const getEmail = async (req: Request, res: Response<ResponseSchema>) => {
  const headerParse = authHeaderSchema.safeParse(req.headers);
  const queryParse = emailQuerySchema.safeParse(req.query);

  if (headerParse.error) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  if (queryParse.error) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'invalid query data',
    });
  }

  const token = headerParse.data.authorization;
  const accessClaims = jwt.verify(token);
  if (!accessClaims || accessClaims.type != 'accessToken') {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  const { page } = queryParse.data;
  const limit = 10;
  const offset = page ? (page - 1) * limit : 0;

  const emails = await emailQuery.pagination.execute({
    userId: accessClaims.claims.id,
    offset,
    limit,
  });
  const pages = await emailQuery.paginationCount.execute({
    userId: accessClaims.claims.id,
  });

  const totalCount = pages[0]?.count ?? 0;

  if (!emails) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'failed',
      error: 'Internal server error',
    });
  }

  return res.status(HttpStatus.OK).json({
    status: 'ok',
    data: {
      emails,
      pages: Math.ceil(totalCount / limit),
      total: totalCount,
      now: page ?? 1,
    },
  });
};

// @Router /api/v1/email DELETE
const deleteEmail = async (req: Request, res: Response<ResponseSchema>) => {
  const headerParse = authHeaderSchema.safeParse(req.headers);
  const bodyParse = emailDeleteBodySchema.safeParse(req.body);

  if (headerParse.error) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  if (bodyParse.error) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'invalid input data',
    });
  }

  const token = headerParse.data.authorization;
  const accessClaims = jwt.verify(token);

  if (!accessClaims || accessClaims.type != 'accessToken') {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  const { emailId } = bodyParse.data;
  try {
    const deleted = await emailRepo.remove(
      and(eq(emails.userId, accessClaims.claims.id), eq(emails.id, emailId)),
    );

    if (!deleted || deleted.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        status: 'failed',
        error: 'failed to delete email',
      });
    }

    return res.status(HttpStatus.OK).json({
      status: 'ok',
    });
  } catch {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'failed',
      error: 'Internal server error',
    });
  }
};

export default { addEmail, getEmail, deleteEmail };
