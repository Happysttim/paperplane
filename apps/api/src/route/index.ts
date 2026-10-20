import express, { type Response } from 'express';
import type { ResponseSchema } from '@/payload/response';
import { HttpStatus, ROUTE_V1_API } from '@/controller/const';
import { errorHandler } from '@/controller/middleware/error';
import { sql } from 'drizzle-orm';
import database from '@/database';
import { redis } from '@/redis';
import * as auth from '@/controller/v1/auth';
import * as verification from '@/controller/v1/verify';
import email from '@/controller/v1/email';
import forward from '@/controller/v1/forward';
import mail from '@/controller/v1/router';
import * as account from '@/controller/v1/account';
import * as destination from '@/controller/v1/destination';
import * as delivery from '@/controller/v1/delivery';
import { verify as authorized } from '@/controller/middleware/authorization';
import { verify as csrf } from '@/controller/middleware/csrf';
import { rateLimit } from '@/controller/middleware/rate-limit';
import { internal } from '@/controller/middleware/internal';
import { issueCsrfTokens } from '@/controller/utils';
const router = express.Router();
router.get('/health', (_req, res: Response<ResponseSchema>) => {
  res.status(HttpStatus.OK).json({ status: 'ok' });
});
router.get('/ready', async (_req, res: Response<ResponseSchema>) => {
  try {
    await Promise.all([database.execute(sql.raw('select 1')), redis.ping()]);
    res.status(HttpStatus.OK).json({ status: 'ok' });
  } catch {
    res
      .status(HttpStatus.SERVICE_UNAVAILABLE)
      .json({ status: 'failed', error: 'Dependencies unavailable' });
  }
});
const api = express.Router();
router.use(ROUTE_V1_API, api);
api.use(rateLimit(120));
api.post('/router', internal, mail.mailRouter);
api.post('/internal/deliveries', internal, delivery.record);
api.get('/auth/csrf', (_req, res: Response<ResponseSchema>) => {
  res.setHeader('Cache-Control', 'no-store');
  res
    .status(HttpStatus.OK)
    .json({ status: 'ok', data: { csrfToken: issueCsrfTokens(res) } });
});
api.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) next();
  else csrf(req, res, next);
});
api.post('/auth/register', rateLimit(20), auth.register);
api.post('/auth/login', rateLimit(20), auth.login);
api.post('/auth/password/reset', rateLimit(20), auth.resetPassword);
api.post('/auth/refresh', auth.refresh);
api.post('/auth/logout', account.logout);
api.get('/verify/oauth', csrf, verification.oauth);
api.post('/verify/provider', verification.provider);
api.post('/verify/email', rateLimit(10), verification.email);
api.post('/verify/code', rateLimit(20), verification.codeVerify);
api.use(authorized);
api.get('/users/me', account.me);
api.patch('/users/me', account.updateMe);
api.delete('/users/me', account.deleteMe);
api.get('/domains', account.listDomains);
api.post('/email', email.addEmail);
api.get('/email', email.getEmail);
api.delete('/email', email.deleteEmail);
api.post('/forward', forward.postRule);
api.patch('/forward', forward.updateRule);
api.delete('/forward', forward.deleteForwards);
api.post('/forward/test', forward.testRule);
api.post(
  '/destinations/verify',
  rateLimit(10),
  destination.requestVerification,
);
api.post('/destinations/confirm', rateLimit(20), destination.confirm);
api.get('/destinations', destination.list);
api.delete('/destinations', destination.remove);
api.get('/deliveries', delivery.list);
router.use((_req, res: Response<ResponseSchema>) => {
  res
    .status(HttpStatus.NOT_FOUND)
    .json({ status: 'failed', error: 'Not found' });
});
router.use(errorHandler);
export default router;
