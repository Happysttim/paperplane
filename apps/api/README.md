# Paperplane API

이메일 주소와 전달 규칙을 관리하고, 수신 메일의 전달 여부를 판단하는 API입니다.
프리미엄 API·결제·사용량 제한은 구현하지 않습니다. 기존 premium DB 구조는 호환성을 위해 남겨 둡니다.

## 실행

Node 22.19 이상과 pnpm 9.4, PostgreSQL, Redis, SMTP 서버가 필요합니다.
저장소 루트에서:

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
pnpm --filter @apps/api keys:generate
# .env에 실제 DB, Redis, SMTP 연결 정보를 입력합니다.
pnpm --filter @apps/api db:migrate
pnpm --filter @apps/api db:seed mail.example.com
pnpm --filter @apps/api dev
```

`keys:generate`는 기존 키를 덮어쓰지 않습니다. 키와 `.env`는 Git에서 제외됩니다.
실행 디렉터리는 `apps/api`이며, 키의 상대 경로도 이 디렉터리를 기준으로 합니다.
배포 실행은 `pnpm --filter @apps/api build` 후 `pnpm --filter @apps/api start`입니다.
프런트엔드는 `WEB_ORIGIN`으로 지정한 주소에서 `credentials: 'include'`로 호출합니다.
운영에서는 HTTPS와 `NODE_ENV=production`을 사용해야 합니다. 쿠키는 HttpOnly, SameSite=Lax이며 운영에서는 Secure입니다.
현재 쿠키 정책은 프런트엔드와 API가 같은 사이트에 배치되는 구성을 전제로 합니다.

### Docker 실행

`Dockerfile`은 Node 22와 pnpm 9.4로 빌드한 뒤 운영 의존성과 `dist`만 실행 이미지로 복사합니다.
인증 메일 HTML도 포함됩니다. 프로세스는 root 대신 `node` 사용자(UID/GID 1000)로 실행합니다.
모노레포 lockfile이 필요하므로 직접 빌드할 때의 context는 **저장소 루트**입니다.

```powershell
docker --context desktop-linux build -f apps/api/Dockerfile -t paperplane/api:local .
Copy-Item apps/api/.env.docker.example apps/api/.env.docker
# 키가 아직 없을 때만 실행합니다. 기존 키는 재사용하세요.
pnpm --filter @apps/api keys:generate
```

1. `apps/database` Compose를 실행하고 기존 DB 안내에 따라 마이그레이션을 적용합니다.
2. `.env.docker`의 `DB_URL`에 API 실행 계정 비밀번호를 URL 인코딩하여 입력합니다.
3. 별도 Redis와 인증 메일 발송용 SMTP의 접속 정보를 설정합니다. 이 Compose는 API만 실행합니다.
4. API Compose를 시작합니다.

```powershell
docker --context desktop-linux compose --project-directory apps/api config --quiet
docker --context desktop-linux compose --project-directory apps/api up -d --build
docker --context desktop-linux compose --project-directory apps/api ps
docker --context desktop-linux compose --project-directory apps/api logs --tail 100 api
Invoke-RestMethod http://127.0.0.1:8080/ready
```

Linux Docker 환경에서는 `--context desktop-linux`를 생략할 수 있습니다.
이미 작성한 `.env.docker`와 키 파일은 덮어쓰지 마세요. 기존 `.env`는 수정하지 않습니다.
`.env.docker`는 Compose가 프로세스 환경 변수로 전달하며 이미지 내부에 복사하지 않습니다.
`Dockerfile.dockerignore`로 로컬 의존성, 키, 환경 파일도 빌드 context에서 제외합니다.

DB에는 `paperplane-database` 네트워크의 `postgres:5432`로 접속합니다.
호스트 Redis/SMTP는 `host.docker.internal`로 접근합니다. Linux에서 호스트의 loopback에만
바인딩된 서비스는 컨테이너에서 접근할 수 없으므로 연결 가능한 인터페이스와 방화벽 설정이 필요합니다.
인증 메일 발송용 SMTP는 수신 검사 포트와 용도가 다릅니다. 기존 Postfix를 사용할 경우
재주입 연결과 신뢰 IP를 별도로 설정해야 하며 이 Compose가 신뢰 범위를 자동 확장하지 않습니다.

키 파일 세 개는 읽기 전용으로 마운트합니다. Linux에서는 UID 1000이 해당 파일을 읽을 수 있어야 합니다.
예를 들어 전용 배포 키 파일의 소유자를 `1000:1000`, 개인키/HMAC 모드를 `0600`으로 설정합니다.
HMAC 키는 SMTP 앱과 같은 파일 내용을 사용해야 합니다.

이미지 기본값은 `NODE_ENV=production`입니다. 예제 `.env.docker`는 로컬 HTTP 쿠키 테스트를 위해
`development`로 덮어씁니다. 운영에서는 `production`, 실제 `WEB_ORIGIN`, HTTPS 프록시를 설정하세요.
API 포트는 호스트의 모든 IPv4 인터페이스(`0.0.0.0:8080`)에 공개합니다.
상태 검사는 `/ready`로 DB·Redis 연결을 확인하며 SMTP/OAuth나 테이블 마이그레이션 완료까지 검사하지 않습니다.
시작 시 자동 마이그레이션은 하지 않으며 실행 이미지에는 마이그레이션 CLI가 포함되지 않습니다.

Docker 이미지 빌드, 예제 환경 설정을 사용한 Compose 문법 검사, 격리 컨테이너의 `/health` 응답을 확인했습니다.
같은 컨테이너에서 UID 1000 실행, bcrypt 해시/비교, 메일 HTML 포함, 소스·키·환경 파일 제외도 확인했습니다.
실제 DB·Redis를 연결한 `/ready` 성공과 인증 메일·OAuth 동작은 별도 통합 검증이 필요합니다.
Node 22 최신 패치를 사용하므로 루트 `engines.node`의 정확한 버전 `22.19.0`과 다르다는 pnpm 경고가 발생할 수 있습니다.

이미지 구성 참고: [Node 공식 Docker 이미지](https://github.com/nodejs/docker-node).

### DB 적용 범위

`migration/`은 **빈 DB에서 시작하는 마이그레이션**입니다. 과거 `drizzle push`로 만든 테이블이 이미 있는 DB에는 바로 적용하지 마세요.
기존 DB 전환용 SQL은 `scripts/upgrade-legacy.sql`에 있습니다. 백업 후 점검된 복제 DB에서 먼저 실행하고 전환해야 합니다.
전환 명령은 `pnpm --filter @apps/api db:upgrade-legacy`입니다. 체크포인트 `64d19db`의 스키마만 대상으로 하며,
전체 변경과 마이그레이션 기준점 등록을 하나의 트랜잭션으로 처리합니다. 중복 도메인·소셜 계정이 있으면 실패하며 자동 삭제하지 않습니다.
이미 전환했거나 마이그레이션 이력이 있는 DB에는 실행을 거부합니다. 이후 변경은 일반 `db:migrate`로 적용합니다.
전환 시 기존 세션은 별도 테이블에 보존되며 다시 로그인해야 합니다. 기존 목적지는 재인증 전까지 라우팅되지 않습니다.
이 작업에서는 사용자의 DB에 마이그레이션이나 초기 데이터를 적용하지 않았습니다.

## 인증 흐름

1. `GET /api/v1/auth/csrf`로 세션 쿠키와 `data.csrfToken`을 받습니다.
2. 이후 POST/PATCH/DELETE 요청에는 `x-paperplane-csrf` 헤더와 쿠키를 보냅니다.
3. 이메일 인증 토큰은 `x-paperplane-verify`로 보냅니다.
4. 가입·로그인 응답의 `data.accessToken`을 `Authorization: Bearer <token>`으로 보냅니다. 응답의 새 `csrfToken`도 반영합니다.
5. `POST /auth/refresh`는 HttpOnly Refresh Token 쿠키를 회전시키고 새 Access Token을 반환합니다. 이전 Access Token은 자체 만료 시점까지 유효합니다.
6. 로그아웃, 비밀번호 재설정, 탈퇴는 관련 Refresh Token 세션을 무효화합니다.

Access Token은 15분, Refresh Token은 1일입니다. Refresh Token은 DB에 해시로 저장됩니다. Access Token에는 사용자 ID만 넣으며, authorization 미들웨어는 JWT 검증 후 next()만 호출합니다. Access Token 인증 시 DB 세션 조회는 하지 않습니다. 로그아웃·비밀번호 재설정 후에도 기존 Access Token은 만료까지 유효합니다.
인증 쿠키가 필요한 쓰기 API와 달리 내부 SMTP API는 아래 HMAC 인증을 사용합니다.

## API 목록

아래 경로의 공통 접두사는 `/api/v1`입니다. `/health`, `/ready`만 접두사 없이 사용합니다.
응답은 `{ "status": "ok", "data": ... }` 또는 `{ "status": "failed", "error": "..." }`입니다.

| Method | 경로                            | 입력 / 동작                                                                                                                 |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                       | 프로세스 상태                                                                                                               |
| GET    | `/ready`                        | PostgreSQL·Redis 연결 확인, 장애 시 503                                                                                     |
| GET    | `/auth/csrf`                    | CSRF 토큰 및 쿠키 발급                                                                                                      |
| POST   | `/verify/email`                 | `{ type: "register" 또는 "password", email }`; 인증 메일 발송, `verifyToken` 반환                                           |
| POST   | `/verify/code`                  | 인증 헤더 + `{ code }`; 6자리 숫자 검증                                                                                     |
| GET    | `/verify/oauth?provider=google` | `google` 또는 `naver`, CSRF 헤더·쿠키 필요; 로그인 URL 반환                                                                 |
| POST   | `/verify/provider`              | `{ provider, code, state }`; 기존 회원 로그인 또는 가입 토큰·`providerId` 반환                                              |
| POST   | `/auth/register`                | 인증 헤더 + 로컬 `{ provider: "local", email, password, passwordConfirm, name }` 또는 소셜 `{ provider, providerId, name }` |
| POST   | `/auth/login`                   | `{ email, password }`                                                                                                       |
| POST   | `/auth/password/reset`          | 인증 헤더 + `{ password, passwordConfirm }`                                                                                 |
| POST   | `/auth/refresh`                 | Refresh Token 쿠키 + CSRF 헤더                                                                                              |
| POST   | `/auth/logout`                  | 현재 Refresh Token 세션 폐기, 쿠키 삭제                                                                                     |
| GET    | `/users/me`                     | 내 정보; 비밀번호 해시·프리미엄 필드 제외                                                                                   |
| PATCH  | `/users/me`                     | `{ name }`, 2~8자                                                                                                           |
| DELETE | `/users/me`                     | `{ confirm: true }`; 이메일·규칙·목적지·이력·세션도 삭제                                                                    |
| GET    | `/domains`                      | 등록 가능한 서비스 도메인 목록                                                                                              |
| POST   | `/email`                        | `{ src: "alias@mail.example.com" }`                                                                                         |
| GET    | `/email?page=1`                 | 본인 주소와 규칙 목록, 페이지당 10개                                                                                        |
| DELETE | `/email`                        | `{ emailId }`; 연결 규칙·이력도 삭제                                                                                        |
| POST   | `/destinations/verify`          | `{ address }`; 메일 발송 후 `verificationToken` 반환                                                                        |
| POST   | `/destinations/confirm`         | `{ verificationToken, code }`; 목적지 소유 확인                                                                             |
| GET    | `/destinations`                 | 인증한 목적지 목록                                                                                                          |
| DELETE | `/destinations`                 | `{ destinationId }`; 해당 목적지로 향하는 본인 규칙도 삭제                                                                  |
| POST   | `/forward`                      | `{ emailId, dest, rule }`; 인증된 외부 목적지만 허용                                                                        |
| PATCH  | `/forward`                      | `{ emailId, forwardId, rule?, dest? }`; 하나 이상 수정                                                                      |
| DELETE | `/forward`                      | `{ emailId, forwardId }`                                                                                                    |
| POST   | `/forward/test`                 | `{ rule, mail }`; `matches`, 그룹별 `groups`, 판정용 `record` 반환                                                          |
| POST   | `/router`                       | 내부 HMAC 인증 + 메일 정보; 전달 판정 목록 반환                                                                             |
| POST   | `/internal/deliveries`          | 내부 HMAC 인증 + 발송 결과 기록                                                                                             |
| GET    | `/deliveries?page=1`            | 본인 전달 이력, 페이지당 20개                                                                                               |

`/users`, `/domains`, `/email`, `/destinations`, `/forward`, `/deliveries`는 Access Token이 필요합니다.
OAuth의 `state`는 발급받은 브라우저의 세션과 연결되므로 콜백 페이지도 같은 쿠키를 유지해야 합니다.
목적지 인증 토큰은 10분 동안 유효하며 확인 시도는 한 번만 허용합니다. 틀리면 60초 간격으로 새 인증을 요청합니다.
가입·비밀번호 인증번호는 토큰당 최대 5번 확인할 수 있으며 재발송 간격은 30초입니다.

## 수신 주소 예약 이름

`POST /api/v1/email`은 주소의 `@` 앞부분이 다음 예약 이름과 정확히 일치하면
HTTP 400과 `{ "status": "failed", "error": "Reserved email address" }`를 반환합니다.
대소문자를 구분하지 않으며 DB 조회·저장 전에 검사합니다.

`noreply`, `no-reply`, `no_reply`, `admin`, `administrator`, `postmaster`,
`hostmaster`, `webmaster`, `abuse`, `security`, `support`, `contact`, `info`,
`billing`, `root`, `system`.

`myadmin`, `admin-team`, `noreply123`처럼 일부만 포함한 이름은 허용합니다.
이 정책은 신규 수신 주소 등록에만 적용하며 기존 주소·회원 이메일·전달 목적지는 변경하지 않습니다.
예약 목록은 `src/utils/email.ts`에서 관리합니다.

## 전달 규칙

`rule: []`는 모든 메일 전달입니다. 규칙 그룹 사이에는 OR, 그룹 내부에는 `type: "and" | "or"`를 적용합니다.
각 문자열 조건은 `middle`(포함), `prefix`(시작), `suffix`(끝)이며 대소문자를 구분하지 않습니다.

```json
{
  "emailId": 1,
  "dest": "owner@example.com",
  "rule": [
    {
      "type": "and",
      "postRule": {
        "newsletter": "all",
        "subject": {
          "type": "or",
          "regexp": [{ "type": "middle", "value": "invoice" }]
        }
      }
    }
  ]
}
```

`postRule`의 선택 필드는 `subject`, `name`, `from`, `content`, `date`, `attachment`입니다.
`newsletter`는 `true`, `false`, `"all"`입니다. `date`는 `{ startDate?, endDate? }` 배열이며 ISO 날짜를 사용합니다.
첨부파일 조건은 `{ type, attachment: [{ filename?: { type, value }, ext?: "pdf" }] }`이며 확장자는 완전 일치합니다.
규칙 테스트 API는 실제 메일을 발송하지 않습니다.

## SMTP 연동

이 API는 메일 수신·발송·재시도를 실행하지 않습니다. SMTP/Postfix 측에서 메일을 분석해 `/router`에 전달하고,
`matches: true`인 목적지로 발송한 결과를 `/internal/deliveries`에 보고해야 합니다.

메일 입력 (`/router`, `/forward/test`의 `mail`):

```json
{
  "headers": [],
  "envelope": {
    "from": "sender@example.com",
    "recipients": ["alias@mail.example.com"]
  },
  "from": { "name": "Sender", "address": "sender@example.com" },
  "subject": "invoice",
  "date": "2026-10-16T00:00:00Z",
  "content": "mail body",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "contentType": "application/pdf",
      "size": 1024
    }
  ],
  "contentSize": 9
}
```

`/router`의 `data`는 `[{ source, destination, matches }]`입니다. 같은 목적지에 여러 규칙이 있으면 여러 행이 반환됩니다.
SMTP 측에서는 `matches: true`인 목적지를 중복 제거해 한 번만 발송해야 합니다.

내부 요청 헤더:

- `x-request-id`: 매 요청마다 새로운 UUID
- `x-paperplane-timestamp`: 밀리초 Unix 시간, 13자리, 서버 시각 기준 ±5분
- `x-paperplane-signature`: 아래 문자열의 HMAC-SHA256 hex; 키는 `HMAC_KEY_PATH` 파일 내용

```text
METHOD.PATH.REQUEST_ID.TIMESTAMP.SHA256(전송하는 원본 JSON 문자열)
```

`PATH`는 `/api/v1/router`처럼 접두사를 포함하며 query string이 있으면 그것도 포함합니다.
동일 요청 ID는 10분 동안 재사용할 수 없습니다. 재시도 시 새 요청 ID·시각·서명을 사용합니다.

발송 결과 입력:

```json
{
  "eventId": "47d68741-b59e-4484-a91c-ad8ab2ef6650",
  "source": "alias@mail.example.com",
  "destination": "owner@example.com",
  "messageId": "smtp-message-001",
  "status": "sent",
  "detail": "accepted by destination server"
}
```

`status`는 `sent`, `failed`, `retrying`입니다. 동일 이벤트 재전송은 같은 `eventId`를 사용합니다.
같은 ID·같은 내용은 중복 저장하지 않고 200을 반환합니다. 같은 ID로 내용을 바꾸면 409입니다.
발송 시도별로 새 이벤트 ID를 사용하고 동일 메일은 같은 `messageId`로 연결합니다.
메일 본문이나 첨부파일 원문은 이력에 저장하지 않습니다.

## 검증

```powershell
pnpm --filter @apps/api typecheck
pnpm --filter @apps/api lint
pnpm --filter @apps/api test
pnpm --filter @apps/api build
```

통합 테스트는 PGlite의 PostgreSQL 엔진에 실제 마이그레이션을 적용하고 로컬 HTTP 요청으로 검증합니다.
Redis·SMTP·OAuth 제공자는 테스트 대역입니다. 실제 Redis 원자성, SMTP 전달 성공, 외부 OAuth 공급자와의 연동은 운영 전 별도 확인해야 합니다.

## 코드 구성

- `src/app.ts`: Express 기본 설정(CORS, 쿠키, JSON 본문).
- `src/route/index.ts`: 라우트와 미들웨어 순서, 공통 오류 처리 연결.
- `src/index.ts`: app과 router 조립, 서버 시작·종료.
- `src/controller`: `Response<ResponseSchema>`와 `HttpStatus`로 응답 계약 유지.
- `src/query`: 재사용하는 조회의 prepared query. 트랜잭션 내부 쿼리는 해당 tx를 사용합니다.
- `src/repository`: 기존 쓰기 쿼리 헬퍼.

오류 응답은 `status`와 `error`를 사용합니다. 인증 메일 재요청 대기 시간은 `Retry-After` 헤더로 전달합니다.
