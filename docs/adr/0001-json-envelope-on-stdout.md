# JSON 모드에서는 오류도 stdout 한 곳으로 낸다

`--format json`일 때 성공과 실패 모두 stdout에 `{ code, message, data }` 봉투를 한 번만 출력하고, 실패는 종료 코드로 구분한다. 일반적인 CLI 원칙("stdout에는 결과만, 오류는 stderr")에서 의도적으로 벗어난 것으로, 주 소비자인 에이전트가 stream 하나만 파싱하면 되도록 하기 위해서다. text 모드는 일반 원칙대로 결과는 stdout, 경고·오류는 stderr를 쓴다.
