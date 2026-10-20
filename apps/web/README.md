# Paperplane Web

React + TypeScript + shadcn UI로 만든 프론트엔드입니다. 로그인, 이메일 주소 생성, 전달 규칙과 받는 메일함 관리 기능을 제공합니다.

## 사용방법

저장소 루트에서 실행합니다. 기존 환경 파일이 있으면 복사를 생략합니다.

```powershell
pnpm install
Copy-Item apps/web/.env.example apps/web/.env.development
pnpm dev:web
```

`http://localhost:5173`으로 접속합니다. API 서버는 별도로 실행해야 합니다.
환경 파일의 `API_SERVER_URL`에는 API 주소를, `VITE_API_BASE_URL`에는 `/api/v1`을 지정합니다.
환경 파일을 변경한 뒤 개발 서버를 재시작합니다. `VITE_` 변수에는 비밀값을 넣지 않습니다.

```powershell
pnpm check:web
pnpm build:web
```

Docker 통합 실행은 [루트 안내](../../README.md)를 참고하세요.
개발 서버의 `/emails?demo=1`에서는 예시 데이터로 화면을 확인할 수 있습니다.
[API 명세](docs/api/README.md), [디자인 문서](docs/design/README.md), [React 화면 사진](docs/implementation/README.md)을 함께 제공합니다.
