import * as dotenv from 'dotenv';

dotenv.config();
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({
  path: `.env.${NODE_ENV}`,
  override: true,
});

const config = {
  dbUrl: process.env.DB_URL || 'localhost',
  listenPort: parseInt(process.env.LISTEN_PORT || '8080'),
  mailer: {
    from: process.env.MAILER_FROM || 'from',
    host: process.env.MAILER_HOST || 'localhost',
    port: parseInt(process.env.MAILER_PORT || '687'),
    secure: Boolean(process.env.MAILER_SECURE || 'false'),
    auth: {
      user: process.env.MAILER_AUTH_USER || 'user',
      password: process.env.MAILER_AUTH_PASSWORD || 'password',
    },
  } as const,
} as const;

export default config;
