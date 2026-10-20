# Paperplane Database

PostgreSQL 18 기반 데이터베이스입니다. API 실행, 마이그레이션, Postfix 수신자 조회에 별도 계정을 사용합니다.
테이블 구조는 `apps/api/migration`에서 관리합니다.

## 사용방법

전체 서비스는 [루트 안내](../../README.md)로 실행합니다. 저장소 루트에서 DB에 접속합니다.

```powershell
docker --context desktop-linux compose --env-file .env.development exec postgres psql -U postgres -d paperplane
```

DB만 별도로 실행하려면 `apps/database/.env.example`을 `.env.development`로 복사하고 비밀번호를 설정합니다. 기존 파일은 재사용합니다.

```powershell
docker --context desktop-linux compose --project-directory apps/database --env-file apps/database/.env.development up -d --build
```

개별 실행의 기본 접속 주소는 `127.0.0.1:5432`입니다. API 마이그레이션은 `paperplane_migrator` 계정으로 실행하고, 이후 Postfix 조회 권한을 적용합니다.

```powershell
docker --context desktop-linux compose --project-directory apps/database --env-file apps/database/.env.development exec -T postgres psql -U postgres -d paperplane -f /opt/paperplane/grant-postfix.sql
```

통합·개별 Compose는 서로 다른 DB 볼륨을 사용합니다. 기존 DB 비밀번호는 환경 파일 수정만으로 바뀌지 않습니다.
`down -v`는 DB 데이터를 삭제하므로 데이터 보존 시 사용하지 않습니다.
