# Paperplane API JSON 명세

[api-reference.json](api-reference.json)에 현재 구현된 API의 종류, Request Payload, Response Payload를 정리했습니다.

- 기준: 2026-10-18 현재 API 작업 트리. 프리미엄 제외.
- 기본 경로: `/api/v1`. `/health`, `/ready`는 예외이며 각 항목의 `path`는 전체 경로입니다.
- `request`: 헤더·쿠키·쿼리·본문 스키마와 JSON 예시. 본문이 없으면 `body: null`입니다.
- `responses`: HTTP 상태별 성공 응답과 분기 조건. `errors`와 `commonErrors`는 오류 응답입니다.
- `$defs`: 전달 조건, 메일, 사용자, 주소, 목적지, 전달 기록의 공용 스키마입니다.
- 필드의 필수 여부는 `schema.required`, 동작 제약은 `notes`를 확인하세요.
- 사용자 정의 명세 JSON이며 OpenAPI 형식은 아닙니다. `$ref`는 같은 파일의 `$defs`를 가리킵니다.
- 샘플 데이터와 토큰은 설명용입니다. 실제 API 응답을 녹화한 문서는 아닙니다.

Access Token은 사용자 ID만 포함하며 JWT 검증 시 DB 세션을 조회하지 않습니다. 쿠키가 필요한 요청은 `credentials: 'include'`를 사용하고, 로그인·가입 후 새 CSRF 토큰을 반영하세요. 내부 SMTP API는 브라우저용 API와 구분했습니다.

## API 목록

| 종류 | Method | 경로 | 기능 |
| --- | --- | --- | --- |
| 상태 | GET | `/health` | 프로세스 상태 |
| 상태 | GET | `/ready` | DB·Redis 준비 상태 |
| 인증 | GET | `/api/v1/auth/csrf` | CSRF 토큰과 세션 쿠키 발급 |
| 인증 | POST | `/api/v1/auth/register` | 회원가입 |
| 인증 | POST | `/api/v1/auth/login` | 이메일 로그인 |
| 인증 | POST | `/api/v1/auth/password/reset` | 비밀번호 재설정 |
| 인증 | POST | `/api/v1/auth/refresh` | 토큰 재발급 |
| 인증 | POST | `/api/v1/auth/logout` | 로그아웃 |
| 인증 검증 | GET | `/api/v1/verify/oauth` | 소셜 인증 URL 생성 |
| 인증 검증 | POST | `/api/v1/verify/provider` | 소셜 인증 결과 검증 |
| 인증 검증 | POST | `/api/v1/verify/email` | 가입·비밀번호 복구 인증 메일 |
| 인증 검증 | POST | `/api/v1/verify/code` | 이메일 인증 코드 확인 |
| 계정 | GET | `/api/v1/users/me` | 내 정보 조회 |
| 계정 | PATCH | `/api/v1/users/me` | 내 이름 변경 |
| 계정 | DELETE | `/api/v1/users/me` | 계정 탈퇴 |
| 주소 | GET | `/api/v1/domains` | 사용 가능한 도메인 조회 |
| 주소 | POST | `/api/v1/email` | 가상 이메일 주소 생성 |
| 주소 | GET | `/api/v1/email` | 내 주소와 전달 규칙 목록 |
| 주소 | DELETE | `/api/v1/email` | 내 주소 삭제 |
| 전달 규칙 | POST | `/api/v1/forward` | 전달 규칙 추가 |
| 전달 규칙 | PATCH | `/api/v1/forward` | 전달 규칙 변경 |
| 전달 규칙 | DELETE | `/api/v1/forward` | 전달 규칙 삭제 |
| 전달 규칙 | POST | `/api/v1/forward/test` | 샘플 메일 조건 판정 |
| 목적지 | POST | `/api/v1/destinations/verify` | 받는 메일함 인증 요청 |
| 목적지 | POST | `/api/v1/destinations/confirm` | 받는 메일함 인증 확정 |
| 목적지 | GET | `/api/v1/destinations` | 인증된 받는 메일함 목록 |
| 목적지 | DELETE | `/api/v1/destinations` | 받는 메일함 삭제 |
| 전달 기록 | GET | `/api/v1/deliveries` | 내 전달 처리 기록 |
| 내부 SMTP | POST | `/api/v1/router` | 수신 메일의 전달 대상·조건 판정 |
| 내부 SMTP | POST | `/api/v1/internal/deliveries` | 전달 처리 이벤트 저장 |

총 **30개** API입니다. 라우트 등록 목록과 문서의 method/path를 대조했습니다.
