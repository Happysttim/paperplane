import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({
  path: `.env.${NODE_ENV}`,
  override: true,
  quiet: true,
});

const config = {
  dbUrl: process.env.DB_URL || 'postgresql://localhost/paperplane',
  production: NODE_ENV === 'production',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  listenPort: parseInt(process.env.LISTEN_PORT || '8080'),
  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || 'private.key',
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || 'public.key',
  hmacKeyPath: process.env.HMAC_KEY_PATH || 'hmac.key',
  redis: {
    address: process.env.REDIS_ADDR || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    user: process.env.REDIS_USER || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
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
    port: parseInt(process.env.MAILER_PORT || '587'),
    secure: process.env.MAILER_SECURE === 'true',
    auth: {
      user: process.env.MAILER_AUTH_USER || '',
      password: process.env.MAILER_AUTH_PASSWORD || '',
    },
  } as const,
} as const;

export default config;
