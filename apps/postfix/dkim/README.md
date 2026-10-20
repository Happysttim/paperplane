# DKIM 키

Paperplane이 보내는 메일에 서명할 OpenDKIM 개인키를 보관하는 폴더입니다.

## 사용방법

1. 개인키를 `mail202610.private` 이름으로 저장합니다.
2. 짝인 공개키를 DNS의 `mail202610._domainkey.paperplane.life` TXT 레코드에 등록합니다.
3. 키 변경 후 저장소 루트에서 실행합니다.

```powershell
docker --context desktop-linux compose --env-file .env.development restart opendkim
```

도메인과 선택자는 `../config/opendkim.conf`에서 설정합니다. 개인키는 Git에서 제외되며 컨테이너에 읽기 전용으로 마운트됩니다.
