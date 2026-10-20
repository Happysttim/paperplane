import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({
  path: `.env.${NODE_ENV}`,
  override: true,
  quiet: true,
});

const config = {
  production: NODE_ENV === 'production',
  requestRoute: process.env.REQUEST_ROUTE || 'http://localhost:5173',
  requestRecord: process.env.REQUEST_RECORD || 'http://localhost:5173',
  postfix: process.env.POSTFIX || 'postfix',
  postfixPort: parseInt(process.env.POSTFIX_PORT || '10025'),
  listenPort: parseInt(process.env.LISTEN_PORT || '10025'),
  hmacKeyPath: process.env.HMAC_KEY_PATH || 'hmac.key',
} as const;

export default config;
