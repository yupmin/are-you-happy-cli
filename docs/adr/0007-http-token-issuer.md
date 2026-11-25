# API_URL이 있으면 HTTP TokenIssuer를 쓰고, 없으면 샘플을 유지한다

[ADR-0005](0005-token-issuer-port.md)는 발급·갱신을 `TokenIssuer`로 바꿨다. 샘플 adapter만 있으면 템플릿을 쓰는 사람이 실제 토큰 엔드포인트를 어디에 끼우는지 코드에서 보이지 않는다.

`ARE_YOU_HAPPY_CLI_API_URL`이 없으면 `Ctx.issuer`는 샘플 adapter다. 지금 동작과 기존 테스트는 그대로다. 값이 있으면 `services/http-token-issuer.ts`가 `{base}/oauth/token`에 `client_credentials`(발급)와 `refresh_token`(갱신)을 POST한다. 경로, 타임아웃, 응답 스키마는 `// CUSTOMIZE:`다.

거절·장애는 `ApiError`만 던진다. 메시지는 status뿐이고, 요청·응답 본문은 붙이지 않는다. `--verbose`의 stack trace에도 Client Secret과 토큰이 남지 않게 하기 위해서다.

- HTTP 상태 그대로 (`401`은 종료 코드 3, `5xx`는 1)
- 타임아웃은 `504`, 네트워크 실패는 `503`, 2xx인데 JSON이 아니거나 스키마에 안 맞으면 `502`
- `reason`은 토큰 흐름이 정한다. 발급 실패는 `credentials_rejected`이고 status만 HTTP 값을 따른다. 갱신 실패는 기존처럼 재발급으로 간다

URL이 절대 http(s)가 아니거나 사용자 정보(`user:password@`)가 있으면 샘플로 내려가지 않고 `400` / `invalid_api_url`이다. 값 자체는 메시지에 넣지 않는다. 갱신 요청의 Client Secret은 포트가 넘기지 않으므로, 설정에 ID와 Secret이 둘 다 있을 때만 붙인다.
