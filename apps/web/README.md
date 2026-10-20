# Paperplane Web

기존 기획·HTML 시안·API JSON 명세를 바탕으로 구현한 React + TypeScript 프론트엔드입니다. 기본 실행은 실제 API 연결 모드입니다.

## 실행과 환경 설정

저장소 루트에서:

```powershell
pnpm install
pnpm dev:web
```

브라우저: `http://127.0.0.1:5173`

`apps/web/.env`를 생성해 다음 값을 지정했습니다. 파일이 없는 새 환경에서는 `.env.example`을 `.env`로 복사하세요.

```dotenv
API_SERVER_URL=http://127.0.0.1:8080
VITE_API_BASE_URL=/api/v1
```

- `API_SERVER_URL`: Vite 개발 프록시의 실제 API 서버 주소. API 프로젝트 기본 포트는 8080입니다.
- `VITE_API_BASE_URL`: 브라우저에서 요청할 API 기본 경로. 개발에서는 `/api/v1` → Vite `/api` 프록시 → API 서버로 전달됩니다.
- `.env` 변경 후 개발 서버를 재시작하세요. API는 별도 터미널에서 `pnpm dev`로 실행합니다. API의 DB·Redis·메일/OAuth 환경 설정도 필요합니다.
- `.env`는 Git에서 제외되며 `.env.example`만 공유합니다. `VITE_` 변수는 브라우저 번들에 공개되므로 비밀키를 넣으면 안 됩니다.
- 운영 빌드는 개발 프록시를 포함하지 않습니다. 웹 호스트에서 `/api`를 API로 reverse proxy하고, SPA 경로는 `index.html`로 fallback하세요. 별도 API origin을 쓰면 빌드 전 `VITE_API_BASE_URL=https://api.example.com/api/v1` 지정과 API의 CORS·쿠키 설정이 필요합니다. OAuth redirect URI는 `/oauth/google/callback`, `/oauth/naver/callback` 경로로 등록합니다.

## 구현 범위

| 영역 | 기능 |
| --- | --- |
| 공개·인증 | 소개, 로그인, 이메일 가입/인증, 비밀번호 복구, Google·네이버 OAuth 콜백 분기 |
| 내 이메일 | 서버 페이지 목록, 도메인 선택, 주소 생성·복사·삭제, 규칙 목록 |
| 전달 설정 | 중첩 AND/OR, 검색어 포함·시작·끝, 뉴스레터, 기간, 첨부파일, 자연어 요약, 서버 샘플 테스트 |
| 받는 메일함 | 인증 코드 발송·확인, 만료/재발송 제한, 삭제, 편집 초안 복귀 |
| 전달 기록 | 서버 페이지 목록, 이벤트별 상태, 상세 펼치기 |
| 계정 | 이름 변경, 비밀번호 변경 진입, 로그아웃, 확인 후 탈퇴 |
| 공통 | shadcn/Radix, 반응형 내비게이션, 로딩·빈 상태·오류, 미저장 이탈 확인 |

프리미엄 기능은 포함하지 않습니다. access/CSRF/검증 토큰은 메모리에서만 관리하고, OAuth 왕복 nonce만 짧게 sessionStorage에 보관합니다. 내부 SMTP API는 브라우저에서 호출하지 않습니다.

## 디자인 미리보기와 이전 HTML 시안

- 개발 서버에서 `http://127.0.0.1:5173/emails?demo=1`로 열면 명시적인 예시 데이터 모드입니다. 화면 위에 배너를 표시하고 실제 API를 호출하지 않습니다. 코드 예시는 `123456`이며 새로고침 시 데이터가 초기화됩니다. 페이지 이동 후 새로고침하면 URL에 `demo=1`을 다시 추가해야 합니다.
- 미리보기는 OAuth 및 서버 조건 판정을 흉내 내지 않습니다. 해당 기능은 실제 API 연결 모드에서 확인합니다. 미리보기 코드는 production 빌드에 포함되지 않습니다.
- 이전 HTML 시안은 `prototype/index.html`에 보존했습니다. `node apps/web/preview.mjs` → `http://127.0.0.1:4173`으로 열 수 있습니다. 이 시안의 데이터는 React 앱과 별개입니다.
- [기획서](docs/ui-ux-plan.md), [상세 설계](docs/design/README.md), [기존 화면 사진 문서](docs/design/screen-guide/index.html), [API 명세](docs/api/api-reference.json), [React 구현·검증 기록](docs/implementation/README.md).

## 코드와 검증

`src/api`는 타입·응답 검증·통신, `src/pages`는 화면, `src/features`는 인증/규칙 로직, `src/hooks`는 재사용 상태, `src/components/ui`는 shadcn 컴포넌트, `src/components/shared.tsx`는 공통 UI입니다.

```powershell
pnpm check:web
pnpm build:web
```

TypeScript strict와 ESLint/TypeScript ESLint/React Hooks 규칙을 적용했습니다. `any`를 사용하지 않으며 이름 있는 기능 함수에 설명 주석을 작성했습니다. shadcn new-york/Radix 소스와 Tailwind 3.4를 사용합니다. [shadcn 소스](https://github.com/shadcn-ui/ui) 및 [MIT 라이선스](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)를 따릅니다. [Tailwind 3 브라우저 지원](https://v3.tailwindcss.com/docs/browser-support)을 기준으로 Chrome/Edge/Firefox 100+, Safari/iOS 15.4+를 빌드 대상으로 설정했습니다. 실제 Safari·Firefox 기기 검증은 별도로 필요합니다.
