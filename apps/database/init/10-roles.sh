#!/bin/sh
set -eu

# psql 변수의 SQL 리터럴 인용으로 비밀번호의 특수문자를 안전하게 처리합니다.
: "${API_DB_PASSWORD:?API_DB_PASSWORD is required}"
: "${MIGRATOR_DB_PASSWORD:?MIGRATOR_DB_PASSWORD is required}"
: "${POSTFIX_DB_PASSWORD:?POSTFIX_DB_PASSWORD is required}"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv api_password API_DB_PASSWORD
\getenv migrator_password MIGRATOR_DB_PASSWORD
\getenv postfix_password POSTFIX_DB_PASSWORD

CREATE ROLE paperplane_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'migrator_password';
CREATE ROLE paperplane_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'api_password';
CREATE ROLE paperplane_postfix LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'postfix_password';

REVOKE ALL ON DATABASE paperplane FROM PUBLIC;
GRANT CONNECT ON DATABASE paperplane TO paperplane_migrator, paperplane_api, paperplane_postfix;
GRANT CREATE ON DATABASE paperplane TO paperplane_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO paperplane_migrator;
GRANT USAGE ON SCHEMA public TO paperplane_api, paperplane_postfix;

-- API 실행에 필요한 데이터 조작 권한만 자동 부여합니다.
ALTER DEFAULT PRIVILEGES FOR ROLE paperplane_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO paperplane_api;
ALTER DEFAULT PRIVILEGES FOR ROLE paperplane_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO paperplane_api;

-- 읽기 전용 기본값에 더해 실제 객체 권한도 별도로 제한합니다.
ALTER ROLE paperplane_postfix SET default_transaction_read_only = on;
SQL
