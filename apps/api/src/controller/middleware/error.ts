import type { ErrorRequestHandler } from 'express';
import type { ResponseSchema } from '@/payload/response';
import { ZodError } from 'zod';
import { logger } from '@/logger';
import { HttpError } from '../errors';
import { HttpStatus } from '../const';
export const errorHandler: ErrorRequestHandler<
  Record<string, string>,
  ResponseSchema
> = (error: unknown, _req, res, _next) => {
  if (res.headersSent) {
    _next(error);
    return;
  }
  if (error instanceof ZodError) {
    res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'Invalid input',
    });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ status: 'failed', error: error.message });
    return;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    res
      .status(HttpStatus.PAYLOAD_TOO_LARGE)
      .json({ status: 'failed', error: 'Payload too large' });
    return;
  }
  if (error instanceof SyntaxError) {
    res
      .status(HttpStatus.BAD_REQUEST)
      .json({ status: 'failed', error: 'Invalid JSON' });
    return;
  }
  logger.error('Request failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .json({ status: 'failed', error: 'Internal server error' });
};
