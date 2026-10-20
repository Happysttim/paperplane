# TLS 인증서

운영 인증서의 `fullchain.pem`과 `privkey.pem`을 이 폴더에 넣으세요.
두 파일은 컨테이너의 `/etc/postfix/tls`에 읽기 전용으로 마운트됩니다.
인증서와 개인키는 Git 및 이미지 빌드 context에서 제외됩니다.

두 파일이 모두 없으면 로컬 테스트용 self-signed 인증서를 데이터 볼륨에
생성합니다. 한 파일만 있으면 잘못된 설정으로 판단해 시작하지 않습니다.
인증서를 갱신한 뒤에는 `docker compose restart postfix`로 다시 읽힙니다.
