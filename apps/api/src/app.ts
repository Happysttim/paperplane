import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from '@/config';

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors({ origin: config.webOrigin, credentials: true }));
app.use(cookieParser());
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buffer) => {
      // The parser exposes IncomingMessage, so declare rawBody at that boundary.
      req.rawBody = buffer.toString('utf8');
    },
  }),
);
