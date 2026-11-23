# 출력 포맷(`--format`)은 action 그룹에만 둔다

스펙은 `--format <text|json>`을 전역 옵션으로 두고 "포맷 결정: `--format` 명시 > stdout이 TTY면 `text`, 아니면 `json`", "에이전트는 모든 호출에 `--format json` 명시"라고 했다. 이를 바꿔 `--format`과 json 봉투(ADR-0001)는 `action` 그룹에만 둔다. `config`·`auth`, 루트의 `--help`·`--version`, 알 수 없는 명령은 항상 text다. 결과는 stdout에, 경고와 오류는 stderr에 쓴다. 이 명령들에 `--format`을 주면 commander의 알 수 없는 옵션 오류(`400`, 종료 코드 2)가 난다. 단, commander는 `--help`·`--version`을 알 수 없는 옵션 검사보다 먼저 처리하므로 `--help --format json`은 오류 없이 text 도움말을 낸다.

이유: 기계가 읽어야 하는 결과는 API를 호출하는 `action`뿐이다. `config`·`auth`는 사람이 설정을 만들고 확인하는 명령이라(`auth client`는 아예 대화형 전용이다) 이 명령들을 위해 json 계약을 유지할 이유가 없다. 에이전트는 이 명령들의 성공과 실패를 종료 코드로 판단하면 된다.

결과:

- `action` 그룹 안에서는 기존 규칙을 그대로 쓴다. `--format` 명시가 가장 우선이고, 없으면 stdout이 TTY일 때 `text`, 아니면 `json`이다. `--format`은 `action` 뒤 어디에나 올 수 있다. `action --format json are-you Minsu`와 `action are-you Minsu --format json` 모두 된다.
- 포맷은 commander를 만들기 전에 정해야 한다(`prescan`). 그래서 첫 위치 인자가 `action`일 때만 그 뒤의 `--format`을 읽는다.
- 그 밖의 명령은 `ctx.result`에 `data`를 남기지 않는다. 렌더링되지 않을 값이기 때문이다.
- `--format`을 `action`보다 앞에 두면(`--format json action ...`) 루트의 알 수 없는 옵션 오류다. 포맷 판단은 `action` 그룹 규칙을 따르므로 비TTY에서는 이 오류도 json 봉투로 나온다.
- json을 갖는 그룹은 `src/output.ts`의 `FORMAT_GROUP`(`// CUSTOMIZE:`) 하나로 정한다.
