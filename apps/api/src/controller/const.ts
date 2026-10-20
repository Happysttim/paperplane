export const ROUTE_V1_API = '/api/v1';

export const OAuth = {
  Authorization: {
    NAVER: 'https://nid.naver.com/oauth2.0/authorize',
    GOOGLE: 'https://accounts.google.com/o/oauth2/v2/auth',
  },
  Token: {
    NAVER: 'https://nid.naver.com/oauth2.0/token',
    GOOGLE: 'https://oauth2.googleapis.com/token',
  },
  Userinfo: {
    NAVER: 'https://openapi.naver.com/v1/nid/me',
    GOOGLE: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
} as const;

export const HttpStatus = {
  // 2xx Success (성공)
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // 3xx Redirection (리다이렉션)
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // 4xx Client Errors (클라이언트 오류)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors (서버 오류)
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
