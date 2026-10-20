# Paperplane Postfix

메일을 수신·발송하는 Postfix 서버와 OpenDKIM 설정입니다. PostgreSQL에서 수신 주소를 확인하고 SMTP 앱으로 메일을 전달합니다.

## 사용방법

[루트 안내](../../README.md)에 따라 환경 파일, [DKIM 키](dkim/README.md), [TLS 인증서](certs/README.md)를 준비합니다.
저장소 루트에서 설정 변경을 반영하고 로그를 확인합니다.

```powershell
docker --context desktop-linux compose --env-file .env.development up -d --build postfix
docker --context desktop-linux compose --env-file .env.development logs -f postfix opendkim
docker --context desktop-linux compose --env-file .env.development exec postfix postqueue -p
```

`config/main.cf`와 `config/master.cf`를 수정하면 이미지를 다시 빌드해야 합니다.
`myhostname`은 시작 시 `POSTFIX_HOSTNAME`으로 덮어쓰므로 루트 `.env.development`도 함께 설정합니다.

- `25`: 외부 메일 수신. 호스트 포트는 `SMTP_BIND_ADDRESS`와 `SMTP_PUBLIC_PORT`로 지정합니다.
- `10025`: SMTP 앱이 전달할 메일을 재주입하는 내부 포트입니다.
- `10027`: API 인증 메일을 받아 DKIM 서명하는 내부 포트입니다.

외부 송수신에는 도메인 MX·A·SPF·DKIM 및 발신 IP의 PTR 설정이 필요합니다.
