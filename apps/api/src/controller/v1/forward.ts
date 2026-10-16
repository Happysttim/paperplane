import { authHeaderSchema } from '@/payload/auth';
import {
  forwardAddBodySchema,
  forwardDeleteBodySchema,
  forwardUpdateBodySchema,
} from '@/payload/forward';
import type { ResponseSchema } from '@/payload/response';
import type { Request, Response } from 'express';
import { HttpStatus } from '../const';
import jwt from '@/jwt';
import domainQuery from '@/query/domain';
import forwardQuery from '@/query/forward';
import forwardRepo from '@/repository/forward';
import { eq } from 'drizzle-orm';
import { forwards } from '@/schema';

// @Router /api/v1/forward POST
const postRule = async (req: Request, res: Response<ResponseSchema>) => {
  const headerParse = authHeaderSchema.safeParse(req.headers);
  const bodyParse = forwardAddBodySchema.safeParse(req.body);

  if (headerParse.error) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  if (bodyParse.error) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'Bad Request',
    });
  }

  const { authorization } = headerParse.data;
  const { emailId, rule, dest } = bodyParse.data;

  const accessClaims = jwt.verify(authorization);

  if (!accessClaims || accessClaims.type !== 'accessToken') {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  const domain = await domainQuery.first.execute();

  if (!domain) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'failed',
      error: 'Internal Server Error',
    });
  }

  if (dest.trim().includes(domain.name)) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'Bad destination email address',
    });
  }

  try {
    const forward = await forwardRepo.create({ emailId, rule, dest });
    if (!forward) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'failed',
        error: 'Internal Server Error',
      });
    }
    res.status(HttpStatus.CREATED).json({
      status: 'ok',
      data: forward,
    });
  } catch {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'failed',
      error: 'Internal Server Error',
    });
  }
};

// @Router /api/v1/forward UPDATE
const updateRule = async (req: Request, res: Response<ResponseSchema>) => {
  const headerParse = authHeaderSchema.safeParse(req.headers);
  const bodyParse = forwardUpdateBodySchema.safeParse(req.body);

  if (headerParse.error) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  if (bodyParse.error) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'Bad Request',
    });
  }

  const { authorization } = headerParse.data;
  const { forwardId, rule, dest, emailId } = bodyParse.data;

  const accessClaims = jwt.verify(authorization);
  if (!accessClaims || accessClaims.type !== 'accessToken') {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  const forward = await forwardQuery.hasForward.execute({
    id: accessClaims.claims.id,
    emailId,
    forwardId,
  });

  if (!forward) {
    return res.status(HttpStatus.NOT_FOUND).json({
      status: 'failed',
      error: 'Not Found',
    });
  }

  try {
    const [updated] = await forwardRepo.update(
      { rule, dest },
      eq(forwards.id, forward.id),
    );

    if (!updated) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'failed',
        error: 'Internal Server Error',
      });
    }

    return res.status(HttpStatus.OK).json({
      status: 'ok',
      data: updated,
    });
  } catch {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'failed',
      error: 'Internal Server Error',
    });
  }
};

// @Router /api/v1/forwards DELETE
const deleteForwards = async (req: Request, res: Response<ResponseSchema>) => {
  const headerParse = authHeaderSchema.safeParse(req.headers);
  const bodyParse = forwardDeleteBodySchema.safeParse(req.body);

  if (headerParse.error) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  if (bodyParse.error) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'Bad Request',
    });
  }

  const { authorization } = headerParse.data;
  const { forwardId, emailId } = bodyParse.data;

  const accessClaims = jwt.verify(authorization);
  if (!accessClaims || accessClaims.type !== 'accessToken') {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'failed',
      error: 'Unauthorized',
    });
  }

  const forward = await forwardQuery.hasForward.execute({
    id: accessClaims.claims.id,
    emailId,
    forwardId,
  });

  if (!forward) {
    return res.status(HttpStatus.NOT_FOUND).json({
      status: 'failed',
      error: 'Not Found',
    });
  }

  try {
    const [deleted] = await forwardRepo.remove(eq(forwards.id, forward.id));
    if (!deleted) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'failed',
        error: 'Internal Server Error',
      });
    }

    return res.status(HttpStatus.OK).json({
      status: 'ok',
    });
  } catch {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'failed',
      error: 'Internal Server Error',
    });
  }
};

export default { postRule, updateRule, deleteForwards };
