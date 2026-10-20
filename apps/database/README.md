# Paperplane PostgreSQL

PostgreSQL 18 공식 이미지를 기반으로 DB와 서비스별 계정을 초기화합니다.
테이블 구조는 중복 작성하지 않고 `apps/api/migration`을 사용합니다.

## 계정과 권한

| 계정 | 용도 | 권한 |
| --- | --- | --- |
| `postgres` | 초기화·관리 | 관리자. 서비스 연결에 사용하지 않음 |
| `paperplane_migrator` | Drizzle 마이그레이션 | DB 내 스키마 생성, public 객체 생성·소유 |
| `paperplane_api` | API 실행·시드 입력 | public 테이블 조회·추가·수정·삭제, 시퀀스 사용. DDL 불가 |
| `paperplane_postfix` | 향후 Postfix 조회 | 별도 권한 스크립트 실행 후 domains.name, emails.src_email만 조회 |

API 기본 권한은 **paperplane_migrator가 생성한 public 객체**에 적용됩니다.
관리자로 마이그레이션을 실행하면 이 기본 권한이 적용되지 않습니다.
Postfix 계정은 사용자·세션·비밀번호·전달 규칙·이력을 조회하거나 수정할 수 없습니다.

## 실행

저장소 루트의 PowerShell에서 실행합니다.

```powershell
Copy-Item apps/database/.env.example apps/database/.env
# .env의 비밀번호 네 개를 서로 다른 임의 값으로 변경합니다.
docker --context desktop-linux compose --project-directory apps/database up -d --build
docker --context desktop-linux compose --project-directory apps/database ps
```

일반 Docker 환경에서는 `--context desktop-linux`를 생략할 수 있습니다.
DB는 기본적으로 호스트의 `127.0.0.1:5432`에만 노출됩니다.
이미 포트를 사용 중이라면 `.env`의 `POSTGRES_PORT`를 변경하세요.

## API 연결 및 최초 마이그레이션

API의 실제 환경 변수 이름은 `DB_URL`입니다. `apps/api/.env`에 다음을 설정합니다.
비밀번호에 URI 예약 문자가 있으면 URL 인코딩한 값을 사용합니다.

```dotenv
DB_URL=postgresql://paperplane_api:<API 비밀번호>@127.0.0.1:5432/paperplane
```

마이그레이션만 별도의 계정으로 실행합니다. 아래 명령의 비밀번호와 포트를 실제 값으로 바꾸세요.
임시 환경 변수는 종료 후 이전 값으로 복구합니다.

```powershell
$previousDbUrl = $env:DB_URL
try {
  $env:DB_URL = 'postgresql://paperplane_migrator:<마이그레이션 비밀번호>@127.0.0.1:5432/paperplane'
  pnpm --filter @apps/api db:migrate
} finally {
  $env:DB_URL = $previousDbUrl
}
```

테이블 생성이 성공한 뒤 Postfix의 두 조회 컬럼에 권한을 부여합니다.
이 SQL은 반복 실행할 수 있습니다. 테이블을 삭제하고 다시 만들었다면 다시 실행합니다.

```powershell
docker --context desktop-linux compose --project-directory apps/database exec -T postgres psql -U postgres -d paperplane -f /opt/paperplane/grant-postfix.sql
```

## 현재 Postfix와의 관계

현재 `apps/postfix`는 `paperplane-database` 네트워크에서 `postgres:5432`에 접속하여
`domains.name`과 `emails.src_email`을 조회합니다. DB를 먼저 실행하고 API 마이그레이션과
위 권한 스크립트를 실행한 뒤 Postfix를 시작하세요. 두 프로젝트의 `POSTFIX_DB_PASSWORD`는
같아야 하며 Postfix 설정 형식상 공백·개행 없는 비밀번호를 사용합니다.
기존 DB Compose를 실행 중이었다면 `up -d`로 네트워크 설정을 반영하세요.
SMTP 앱과 API의 조건별 라우팅은 그대로 유지됩니다. 이 계정은 SMTP 인증 계정과 별개입니다.
Postfix에서 같은 테이블의 다른 컬럼까지 조회하는 `SELECT *`는 허용되지 않습니다.
## 데이터 보존과 비밀번호 변경

공식 이미지의 초기화 스크립트는 **데이터 볼륨이 비어 있는 첫 실행에만** 실행됩니다.
기존 볼륨에서 `.env`만 변경하거나 이미지를 다시 빌드해도 계정 비밀번호와 권한은 바뀌지 않습니다.
비밀번호 변경은 관리 연결에서 `\password 계정명`을 사용하고 클라이언트 설정도 갱신하세요.
초기화가 실패하면 로그를 확인해야 하며 재시작만으로 초기화 스크립트가 재실행되지는 않습니다.

`docker compose down`은 데이터를 보존합니다. `down -v`는 DB 데이터를 삭제합니다.
운영 데이터에는 볼륨 삭제를 사용하지 말고 별도 백업·복구 절차를 적용하세요.
메이저 버전 업그레이드는 이미지 태그 변경만으로 처리하지 않습니다.
`.env`는 Git과 이미지 빌드에서 제외되지만 Docker 관리 권한이 있으면 환경 변수를 볼 수 있습니다.

공식 이미지 문서: https://hub.docker.com/_/postgres

