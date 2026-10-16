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
  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || 'private.key',
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || 'public.key',
  hmacKeyPath: process.env.HMAC_KEY_PATH || 'hmac.key',
  redis: {
    address: process.env.REDIS_ADDR || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    user: process.env.REDIS_USER || 'user',
    password: process.env.REDIS_PASSWORD || 'password',
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  provider: {
    naver: {
      id: process.env.OAUTH_NAVER_CLIENT_ID || 'clientID',
      secret: process.env.OAUTH_NAVER_CLIENT_SECRET || 'clientSecret',
      redirectURI: process.env.OAUTH_NAVER_REDIRECT_URI || 'redirect uri',
    },
    google: {
      id: process.env.OAUTH_GOOGLE_CLIENT_ID || 'clientID',
      secret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || 'clientSecret',
      redirectURI: process.env.OAUTH_GOOGLE_REDIRECT_URI || 'redirect uri',
    },
  },
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
