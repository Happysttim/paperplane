# TLS 인증서

Postfix의 TLS 연결에 사용할 인증서와 개인키를 보관하는 폴더입니다.

## 사용방법

`fullchain.pem`과 `privkey.pem`을 이 폴더에 저장한 뒤, 저장소 루트에서 실행합니다.

```powershell
docker --context desktop-linux compose --env-file .env.development restart postfix
```

컨테이너는 두 파일을 읽기 전용으로 사용합니다. 두 파일이 모두 없으면 개발용 자체 서명 인증서를 생성하고, 하나만 있으면 시작하지 않습니다.
인증서와 개인키는 Git에서 제외됩니다.
