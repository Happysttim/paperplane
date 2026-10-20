# Paperplane SMTP

Postfix의 content filter로 메일을 받아 API에 라우팅을 요청하고, 매칭된 목적지를 Postfix 재주입 포트로 전달합니다.
통합 실행은 저장소 루트 `compose.yaml`을 사용합니다.

## 실패 처리

- API HTTP 오류, 연결 실패, 15초 시간 초과, 잘못된 JSON/라우팅 형식: SMTP `451` 임시 오류.
- 정상 API 응답에서 매칭 없음: SMTP 성공. 전달 규칙에 따른 정상적인 미전달입니다.
- Postfix 재주입 실패: 모든 진행 중인 전송이 끝난 뒤 `451` 반환.
- 재주입 완료 후 이력 API 실패: 이벤트 ID를 오류 로그에 남기고 SMTP 성공. 이미 수락된 메일을 이력 오류만으로 중복 전달하지 않습니다.
- 첨부 스트림을 끝까지 소비하고, 분석·전달 작업 종료 후 임시 원본 파일을 정리합니다.

여러 목적지 중 일부만 성공한 뒤 실패하면 원본 재시도로 성공한 목적지에 중복 전달될 수 있습니다.
목적지별 영속 처리 상태와 이력 재전송 큐는 아직 구현하지 않았습니다.
`sent`는 외부 메일함 도착이 아니라 Postfix 큐 수락입니다.

## 검증

저장소 루트에서 실행합니다.

```powershell
pnpm --filter smtp exec tsc --noEmit
pnpm --filter smtp exec eslint src
docker --context desktop-linux build -f apps/smtp/Dockerfile -t paperplane/smtp:local .
$testPath = (Resolve-Path apps/smtp/tests).Path
docker --context desktop-linux run --rm --network none --mount "type=bind,source=$testPath,target=/app/tests,readonly" paperplane/smtp:local node --test tests/docker-flow.cjs
```

테스트는 실제 SMTP 앱 프로세스에 `DATA`를 전송하며, API와 목적지 SMTP는 컨테이너 내부 테스트 서버입니다.
첨부 처리, 서명, 이력 기록, API 오류·시간 초과·연결 끊김, 매칭 없음, 임시 파일 정리를 검사합니다.
`--network none`으로 외부 메일 발송을 차단합니다. 실제 API·Postfix 전체 흐름의 검증과는 별개입니다.
