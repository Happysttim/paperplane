# Paperplane SMTP

Postfix에서 받은 메일을 분석하고 API에 전달 대상을 조회한 뒤, 일치하는 목적지로 메일을 전달하는 애플리케이션입니다.

## 사용방법

[루트 안내](../../README.md)로 전체 서비스를 준비한 후 저장소 루트에서 실행합니다.

```powershell
docker --context desktop-linux compose --env-file .env.development up -d --build smtp
docker --context desktop-linux compose --env-file .env.development logs -f smtp
```

루트 Compose가 API·Postfix 연결 주소와 API와 공유하는 HMAC 키를 설정합니다.
SMTP 수신 포트는 내부 `10025`입니다. 기록의 `sent`는 Postfix 큐 수락을 의미하며, 최종 전달 결과는 Postfix 로그에서 확인합니다.

```powershell
pnpm --filter smtp exec tsc --noEmit
pnpm --filter smtp exec eslint src
```
