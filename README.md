# Paperplane

용도별 이메일 주소를 만들고, 조건에 맞는 메일을 원하는 메일함으로 전달하는 서비스입니다.

| 프로젝트 | 역할 |
| --- | --- |
| [web](apps/web/README.md) | React 웹 화면 |
| [api](apps/api/README.md) | 인증, 주소·전달 규칙·기록 관리 |
| [smtp](apps/smtp/README.md) | 수신 메일 분석과 전달 처리 |
| [postfix](apps/postfix/README.md) | 메일 송수신과 DKIM 서명 연결 |
| [database](apps/database/README.md) | PostgreSQL과 서비스별 DB 계정 |

## 사용방법

Docker Desktop의 Linux 엔진이 필요합니다. 로컬 개발에는 Node.js 22와 pnpm 9.4를 사용합니다.
아래 명령은 저장소 루트에서 실행합니다.

1. `.env.example`을 `.env.development`로 복사하고 DB 비밀번호, 도메인, 웹 주소와 OAuth 값을 입력합니다. 기존 환경 파일은 재사용합니다.
2. `pnpm install` 후, 인증 키가 없는 최초 실행에만 `pnpm --filter @apps/api keys:generate`를 실행합니다.
3. [DKIM 개인키](apps/postfix/dkim/README.md)와 [TLS 인증서](apps/postfix/certs/README.md)를 준비합니다.
4. 전체 서비스를 실행합니다.

```powershell
docker --context desktop-linux compose --env-file .env.development up -d --build
docker --context desktop-linux compose --env-file .env.development ps -a
```

웹은 `http://localhost:<WEB_PORT>`에서 접속합니다. 예시 파일은 8088, 현재 개발 설정은 5173입니다.
`WEB_ORIGIN`과 OAuth 콜백도 접속 주소에 맞춥니다. 컨테이너는 루트 환경 파일을 사용합니다.
마이그레이션과 Postfix DB 조회 권한은 자동 적용되며, 사용할 도메인은 다음처럼 등록합니다.

```powershell
docker --context desktop-linux compose --env-file .env.development exec postgres psql -U postgres -d paperplane -c "INSERT INTO domains (name) VALUES ('paperplane.life') ON CONFLICT DO NOTHING;"
docker --context desktop-linux compose --env-file .env.development logs -f api smtp postfix
docker --context desktop-linux compose --env-file .env.development down
```

`down`은 데이터를 보존합니다. `down -v`는 DB와 메일 큐 볼륨을 삭제합니다.
일반 Linux에서는 `--context desktop-linux`를 생략합니다.
