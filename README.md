# Paperplane 통합 Docker 실행

루트 `compose.yaml`로 Web, API, SMTP, Postfix, PostgreSQL, Redis를 함께 실행합니다.
OpenDKIM도 함께 실행하여 자체 발신 메일에 서명합니다. 시작 전에
`apps/postfix/dkim/mail202610.private`에 DNS 공개키와 짝인 개인키를 준비하세요.
프로젝트별 Compose는 개별 개발용으로 남겨 두며 루트 구성에서 include하지 않습니다.
루트 `.env` 하나로 내부 주소와 공통 비밀번호를 관리합니다.

| 서비스 | 역할 | 기본 호스트 포트 |
| --- | --- | --- |
| web | React 정적 파일, `/api` 프록시, SPA 라우팅 | `0.0.0.0:8088` (`WEB_PORT`로 변경) |
| api | 인증·주소·규칙·이력 API | `0.0.0.0:8080` |
| smtp | 수신 메일 분석, HMAC API 호출, 전달 요청 | 내부 `10025` |
| postfix | pgsql 수신자 검사, 수신·발신 큐 | `127.0.0.1:2525` → `25` |
| opendkim | `paperplane.life` 자체 발신 DKIM 서명 | 내부 `8891` |
| postgres | 계정별 권한이 분리된 DB | 내부 `5432` |
| redis | 인증 코드·세션·요청 제한 저장 | 내부 `6379` |
| migrate | API 마이그레이션 후 정상 종료 | 없음 |
| postfix-grants | Postfix 조회 권한 적용 후 정상 종료 | 없음 |

## 최초 실행

저장소 루트에서 실행합니다. 기존 파일이 있다면 복사·키 생성을 생략합니다.

```powershell
Copy-Item .env.example .env
# .env의 비밀번호 4개를 서로 다른 임의 값으로 변경합니다.
pnpm --filter @apps/api keys:generate
docker --context desktop-linux compose config --quiet
docker --context desktop-linux compose up -d --build
docker --context desktop-linux compose ps -a
```

Docker Desktop Linux 엔진을 실행해야 합니다. 일반 Linux에서는 `--context desktop-linux`를 생략합니다.
키 생성에 필요한 pnpm이 없다면 Node로 `apps/api` 폴더에서 `node scripts/keys.mjs`를 실행해도 됩니다.
컨테이너의 API와 SMTP는 UID 1000으로 실행하므로 Linux의 키 파일은 해당 UID가 읽을 수 있어야 합니다.
개인키/HMAC은 전용 배포 파일 소유자를 UID 1000, 모드를 0600으로 두세요.
SMTP와 API는 동일한 HMAC 파일을 마운트합니다. 키나 환경 파일은 이미지에 포함되지 않습니다.

브라우저: http://localhost:8088

`WEB_PORT`를 바꾸면 `WEB_ORIGIN`과 OAuth 콜백 URL도 같은 포트로 맞춥니다.
DB URL을 Compose에서 조립하므로 API/MIGRATOR 비밀번호에는 영문·숫자·`_`·`-`만 사용하세요.
예를 들어 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`로 생성할 수 있습니다.

최초 실행은 새 볼륨에 계정을 만들고 마이그레이션을 적용합니다. 이후에는 새 마이그레이션만 실행합니다.
`migrate`, `postfix-grants`의 `Exited (0)`은 정상입니다. 실패 시 후속 서비스는 시작하지 않습니다.
컨테이너 시작 시 서비스 준비를 기다리는 구성은 [Compose 공식 시작 순서](https://docs.docker.com/compose/how-tos/startup-order)를 따릅니다.
도메인은 자동으로 등록하지 않습니다. 실제 서비스 도메인을 다음처럼 추가하세요.

```powershell
docker --context desktop-linux compose exec postgres psql -U postgres -d paperplane -c "INSERT INTO domains (name) VALUES ('paperplane.example') ON CONFLICT DO NOTHING;"
```

## 기존 데이터와 개별 Compose

### 개발 환경 파일

로컬 개발 설정은 각 프로젝트의 `.env.development`에 저장하며 Git에서 제외합니다.
API/SMTP는 작업 디렉터리의 해당 파일을 자동으로 읽고, Web은 Vite 개발 모드에서 읽습니다.
OAuth client secret은 API와 루트 Compose 환경에만 두며 Web에는 넣지 않습니다.
개발용 OAuth 콜백은 `http://localhost:5173/callback/oauth/google`과
`http://localhost:5173/callback/oauth/naver`입니다. 브라우저도 `localhost:5173`으로 접속하세요.

Compose는 `.env.development`를 자동 선택하지 않으므로 명시합니다.

```powershell
# 전체 Docker 개발 환경: Web 5173, API/DB/Redis/SMTP는 내부 통신
docker --context desktop-linux compose --env-file .env.development up -d --build

# 개별 개발 시 DB와 Postfix 설정 선택
docker --context desktop-linux compose --project-directory apps/database --env-file apps/database/.env.development up -d --build
docker --context desktop-linux compose --project-directory apps/postfix --env-file apps/postfix/.env.development up -d --build
```

전체 Docker 실행과 개별 개발 방식은 함께 실행하지 마세요. 개별 방식의 API/Web/SMTP는 호스트에서 실행하고
Redis는 별도로 `127.0.0.1:6379`에 준비해야 합니다. DB 마이그레이션·조회 권한 적용은 database README를 따릅니다.
개별 API는 `127.0.0.1:5432`, SMTP 재주입은 `127.0.0.1:10026`, 내부 API는 `127.0.0.1:8080`을 사용합니다.
API 인증 메일용 `MAILER_PORT`는 Postfix 서명 리스너의 호스트 포트 `10027`입니다.
실제 메일 도메인 정보는 아직 `.example` 예제 값이므로 인증 메일 발송을 위해서는 별도 설정이 필요합니다.

루트 기본 프로젝트 이름은 `paperplane`입니다. DB/큐 볼륨은 프로젝트별 Compose의 기존 볼륨과 **별개**이며
기존 데이터가 자동 이전되지 않습니다. 기존 환경에 데이터가 있다면 백업·복구 계획을 세운 뒤 이전하세요.
과거 Drizzle push로 만든 DB는 바로 마이그레이션하지 말고 `apps/api/README.md`의 기존 DB 전환 절차를 따릅니다.
개별 Postfix가 이미 2525를 사용 중이면 중지하거나 루트 `SMTP_PUBLIC_PORT`를 바꿉니다.
기존 `.env`와 인증 키는 수정하지 않으며 루트 Compose는 프로젝트별 `.env`를 읽지 않습니다.

```powershell
docker --context desktop-linux compose logs --tail 100 api smtp postfix
docker --context desktop-linux compose exec api node -e "fetch('http://127.0.0.1:8080/ready').then(async r=>console.log(r.status,await r.text()))"
docker --context desktop-linux compose down
```

`down`은 데이터를 보존하고 **`down -v`는 DB·Redis·대기 메일까지 삭제**합니다.
기존 DB 볼륨에서 `.env`의 비밀번호만 바꿔도 DB 계정 비밀번호는 바뀌지 않습니다.
관리 접속에서 계정 비밀번호를 변경하고 `.env`를 맞춰야 합니다.

## 메일과 운영 설정

수신은 `Postfix:25 → SMTP:10025 → API 라우팅 → Postfix:10025 → 외부 MX` 순서입니다.
인증 메일은 API에서 Postfix 서명 전용 포트 `10027`로 보냅니다. 전달용 `10025`와 서명용 `10027`은 루트 Compose에서 호스트에 공개하지 않습니다.
신뢰 메일 네트워크에는 API·SMTP·Postfix만 연결하며 DB/Redis/Web은 분리합니다.
DB 수신자 검사는 `domains.name`, `emails.src_email`을 조회합니다.

기본 `.example` 도메인과 로컬 바인딩은 개발용입니다. 인터넷 송수신에는 실제 도메인, DNS/MX/PTR,
인바운드·아웃바운드 TCP 25 및 인증서가 필요합니다. TLS 파일은 `apps/postfix/certs`에 둡니다.
HTTPS 운영에서는 `NODE_ENV=production`, 실제 `WEB_ORIGIN`과 OAuth 설정을 입력하고 앞단 HTTPS 프록시를 준비하세요.
현재 Compose의 Web은 HTTP이며 HTTPS 인증서 자동 발급 기능은 없습니다.
각 healthcheck는 의존 서비스 연결이나 포트를 확인하며 외부 메일함 도착·OAuth 동작을 보장하지 않습니다.

SMTP 앱은 API 조회 실패·시간 초과·잘못된 응답에 `451`을 반환해 Postfix가 재시도하도록 합니다.
첨부 스트림도 끝까지 소비합니다. 일부 목적지만 성공한 경우 재시도 중 중복 전달 가능성은 남아 있습니다.
처리 보장 범위와 격리 DATA 테스트 방법은 `apps/smtp/README.md`를 참고하세요.

## 검증 결과

별도 임시 프로젝트·볼륨·키로 실제 Docker 통합 실행을 확인했습니다.

- 전체 이미지 빌드 성공, 상시 서비스 6개 healthy
- DB 초기화·API 마이그레이션·Postfix 조회 권한 적용 성공
- API `/ready`: 실제 PostgreSQL·Redis 연결 후 200
- Web 상세 경로 `/emails`: 200, `/api/v1/auth/csrf` 프록시 정상 응답
- Postfix pgsql 도메인·수신 주소 조회: 등록된 키에 `1` 반환
- 등록 수신자 RCPT: `250`, 미등록 수신자 RCPT: `550 5.1.1`

SMTP 검사는 RCPT 단계까지만 수행했습니다. 외부 메일 발송과 전체 DATA 처리·OAuth는 검증하지 않았습니다.
검증용 컨테이너·볼륨·키는 정리했으며 실제 사용자 환경을 실행하거나 기존 DB를 변경하지 않았습니다.
