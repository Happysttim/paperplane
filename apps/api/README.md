# Paperplane API

Express + TypeScript API입니다. 회원 인증, 이메일 주소, 목적지, 전달 규칙과 전달 기록을 관리합니다.

## 사용방법

전체 실행은 [루트 안내](../../README.md)를 따릅니다. 아래 명령은 저장소 루트 기준입니다.

```powershell
docker --context desktop-linux compose --env-file .env.development logs -f api
```

로컬 개발 시 PostgreSQL·Redis·SMTP를 준비하고 `apps/api/.env.development`에 `DB_URL`, Redis·메일 연결 정보, 인증 키 경로, `WEB_ORIGIN`, OAuth 값을 설정합니다.
`apps/api/.env.docker.example`에서 필요한 변수 이름을 확인할 수 있으며, 로컬 연결 주소와 키 경로로 바꿔야 합니다.

```powershell
pnpm install
# 인증 키가 없을 때만 실행합니다.
pnpm --filter @apps/api keys:generate
pnpm --filter @apps/api dev
```

기본 주소는 `http://localhost:8080/api/v1`이며 `/ready`에서 DB·Redis 연결 상태를 확인합니다.
테이블 변경은 `db:generate`로 생성하고 마이그레이션 계정의 `DB_URL`로 `db:migrate`를 실행합니다.

```powershell
pnpm --filter @apps/api typecheck
pnpm --filter @apps/api lint
pnpm --filter @apps/api test
pnpm --filter @apps/api build
```

요청·응답 형식은 [API 명세](../web/docs/api/api-reference.json)를 참고하세요.

## API 엔드포인트

총 30개입니다. `/health`, `/ready`를 제외한 아래 경로에는 `/api/v1`을 붙입니다.
실제 라우트는 [src/route/index.ts](src/route/index.ts)에서 관리합니다.

| 구분 | Method | 경로 | 기능 |
| --- | --- | --- | --- |
| 상태 | GET | `/health` | 프로세스 상태 확인 |
| 상태 | GET | `/ready` | DB·Redis 연결 확인 |
| 인증 | GET | `/auth/csrf` | CSRF 토큰 발급 |
| 인증 | POST | `/auth/register` | 회원가입 |
| 인증 | POST | `/auth/login` | 이메일 로그인 |
| 인증 | POST | `/auth/password/reset` | 비밀번호 재설정 |
| 인증 | POST | `/auth/refresh` | Access Token 재발급 |
| 인증 | POST | `/auth/logout` | 로그아웃 |
| 검증 | GET | `/verify/oauth` | 소셜 인증 URL 생성 |
| 검증 | POST | `/verify/provider` | 소셜 인증 결과 확인 |
| 검증 | POST | `/verify/email` | 가입·비밀번호 복구 인증 코드 발송 |
| 검증 | POST | `/verify/code` | 이메일 인증 코드 확인 |
| 계정 | GET | `/users/me` | 내 정보 조회 |
| 계정 | PATCH | `/users/me` | 이름 변경 |
| 계정 | DELETE | `/users/me` | 계정 탈퇴 |
| 주소 | GET | `/domains` | 사용 가능한 도메인 조회 |
| 주소 | POST | `/email` | 이메일 주소 생성 |
| 주소 | GET | `/email` | 내 주소와 전달 규칙 목록 조회 |
| 주소 | DELETE | `/email` | 이메일 주소 삭제 |
| 전달 규칙 | POST | `/forward` | 규칙 생성 |
| 전달 규칙 | PATCH | `/forward` | 규칙 수정 |
| 전달 규칙 | DELETE | `/forward` | 규칙 삭제 |
| 전달 규칙 | POST | `/forward/test` | 샘플 메일의 조건 일치 여부 확인 |
| 목적지 | POST | `/destinations/verify` | 받는 메일함 인증 코드 발송 |
| 목적지 | POST | `/destinations/confirm` | 받는 메일함 인증 확정 |
| 목적지 | GET | `/destinations` | 인증된 받는 메일함 목록 조회 |
| 목적지 | DELETE | `/destinations` | 받는 메일함 삭제 |
| 전달 기록 | GET | `/deliveries` | 내 전달 처리 기록 조회 |
| 내부 SMTP | POST | `/router` | 수신 메일의 전달 대상과 조건 판정 |
| 내부 SMTP | POST | `/internal/deliveries` | 전달 처리 기록 저장 |

계정·주소·전달 규칙·목적지·전달 기록 API는 Bearer Access Token이 필요합니다.
내부 SMTP API는 HMAC 인증을 사용합니다. 나머지 변경 요청과 `GET /verify/oauth`에는 CSRF 검증이 적용됩니다.
가입·인증·토큰 갱신별 추가 헤더와 쿠키는 위 API 명세를 참고하세요.
