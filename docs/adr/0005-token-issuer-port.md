# Access Token 발급은 TokenIssuer로 바꾸고, Mood는 그 밖에 둔다

스펙은 가상 API를 `services/api`의 프로세스 내 함수로 적었다. 발급·갱신과 Sample Action의 Mood 조회가 한 파일에 있고, 토큰 흐름이 그 파일을 직접 import했다. 템플릿에서 API를 바꿀 때 토큰 흐름까지 고쳐야 했다.

이 ADR은 그 문장을 다음으로 바꾼다. 발급과 갱신은 `TokenIssuer`다. `issueToken`은 Client Credentials를 받고, `refreshAccessToken`은 Refresh Token을 받는다. 둘 다 `TokenResponse`를 반환하고, 거절은 `ApiError`다. `run-cli`가 `Ctx.issuer`에 adapter를 꽂고, 토큰 흐름은 그 필드만 부른다. 샘플 adapter는 `services/sample-issuer.ts`다.

Mood 조회는 Sample Action 전용이다. `services/sample-mood.ts`에 두고 `TokenIssuer`에 넣지 않는다. `callWithAccessToken`의 콜백이 그 호출을 넘긴다.

`REASON`과 Language Pack 문장으로 바꾸는 일은 토큰 흐름에 남는다. `ApiError`가 아닌 예외는 예상 못한 오류다.
