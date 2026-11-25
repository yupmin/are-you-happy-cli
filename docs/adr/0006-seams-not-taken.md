# 얕은 seam은 추가하지 않는다

[ADR-0005](0005-token-issuer-port.md)가 Access Token 발급 seam을 `TokenIssuer`로 정했다. 같은 조사에서 아래 후보는 거절한다. 두 번째 adapter가 없고, interface가 구현과 거의 같다.

- **통합 Store.** Config File는 시작 시 스냅샷, `.env`는 줄 단위 수정, Token State는 매 `read()`마다 다시 읽는다. 공통 `read`/`write` interface는 세 연산의 합이라 얕다. 공유 구현은 `PrivateFileStore`다.
- **Output strategy.** text와 json은 `Output` 한 곳이 나눈다. 명령별 renderer는 [ADR-0002](0002-commands-build-result-output-renders.md)가 거절했다. formatter를 나누면 [ADR-0001](0001-json-envelope-on-stdout.md)과 [ADR-0004](0004-failure-warnings-and-reason.md)의 봉투가 갈라진다.
- **명령 레지스트리.** `registerConfig`, `registerAuth`, `registerAction`이 이미 등록 지점이다. `--format`은 action 그룹만 갖는다 ([ADR-0003](0003-format-only-for-action.md)). 같은 모양의 등록 interface는 그 예외를 숨긴다.
- **`Io`에 파일 시스템.** `Io`는 시계, 난수, 프롬프트, stdout/stderr를 이미 두 adapter(실행, 테스트)로 받는다. 파일 권한은 `private-file`이 `node:fs`로 다루고, 테스트는 임시 디렉터리에서 mode 600을 본다. 메모리 adapter는 그 mode와 심볼릭 링크를 재현해야 해서, 재현이 빠지면 테스트만 통과한다.
- **DI 컨테이너.** `run-cli`가 adapter를 조립한다. 컨테이너는 그 조립을 다른 파일로 옮길 뿐이다.

세 번째 출력 형식이 생기거나, 임시 디스크로 쓸 수 없는 파일 테스트가 생기기 전에는 이 결정을 다시 열지 않는다.
