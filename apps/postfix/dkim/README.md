# DKIM 키

외부 서버에서 생성한 `mail202610.private`를 이 폴더에 보관합니다.
DNS에는 같은 쌍의 공개키를 `mail202610._domainkey.paperplane.life` TXT로 등록합니다.
기존 키를 재생성하지 않습니다. `.txt` 파일은 컨테이너에 필요하지 않습니다.

개인키는 Git/이미지에서 제외하며 OpenDKIM 컨테이너에 읽기 전용으로 마운트합니다.
컨테이너는 키를 tmpfs에 복사한 뒤 opendkim 소유자·0600 권한으로 사용합니다.
Postfix와 API에는 DKIM 개인키를 전달하지 않습니다.

서명 도메인과 선택자는 `../config/opendkim.conf`의 `Domain`, `Selector`입니다.
키 변경 시 DNS 공개키와 일치시킨 뒤 OpenDKIM을 재시작해야 합니다.
