# are-you-happy-cli

Agent Skill에서 호출하는 CLI의 샘플입니다. 가상 API(are.you.happy.cli)에 **Access Token**을 보내 이름에 대한 **Mood**(`happy`, `sad`, `angry`, `excited`, `tired`)를 받아옵니다.

진짜 목적은 **템플릿**입니다. **Sample Action**(`action are-you`)을 걷어내고 인증(auth)·설정(config)·출력·i18n 로직을 재활용해 다른 CLI를 만드는 출발점으로 씁니다. 자세한 스펙은 [`docs/spec.md`](docs/spec.md), 용어는 [`GLOSSARY.md`](GLOSSARY.md)를 따릅니다.

에이전트용 지침은 Agent Skill [`skills/are-you-happy-cli/SKILL.md`](skills/are-you-happy-cli/SKILL.md)에 있습니다.

## 요구 사항

- Node.js ≥ 22

## 설치와 사용

설치 없이 `npx`로 실행합니다.

```sh
npx are-you-happy-cli --help
```

## 빠른 시작

```sh
# 1. Config File 생성 (대화형, 또는 플래그로 비대화형)
npx are-you-happy-cli config init --lang ko --timezone Asia/Seoul

# 2. Client Credentials 등록 (대화형 전용, 현재 폴더의 .env에 저장)
#    샘플 값: ID happy-client / SECRET happy-secret
npx are-you-happy-cli auth client

# 3. Mood 확인 (Access Token이 없으면 자동 발급, 유효한 동안 재사용)
npx are-you-happy-cli action are-you 민수
# 민수는 행복해
```

## 명령

전역 옵션: `--lang <en|ko>`, `--timezone <IANA>`, `--verbose`, `--version`, `-h/--help`

`action` 그룹 옵션: `--format <text|json>`

| 명령 | 동작 |
|---|---|
| `config init` | 언어(Language Pack이 있는 `en`, `ko`)와 타임존을 골라 Config File 저장. `--lang`, `--timezone`을 모두 주면 비대화형 |
| `config show` | 검증을 거친 최종 설정값과 출처(flag / shell env / .env / config.json / default). 언어·타임존이 기본값으로 대체되면 출처는 `default`. `SECRET`·`TOKEN`이 들어간 키는 마스킹 |
| `auth client` | **대화형 전용.** Client Credentials(ID, SECRET)를 입력받아 cwd의 `.env`에 저장. 비TTY면 `400` |
| `auth issue-token` | Client Credentials로 Access Token을 발급받아 Token State 저장. 불일치 시 `401` |
| `auth purge-token` | Token State 삭제 |
| `action are-you <name>` | (Sample Action) 무작위 Mood와 설정 타임존 기준 시각 반환. Config File이 없으면 `400` |

`action`은 Token State가 없으면 Access Token을 자동 발급하고(유효한 동안은 재사용), 만료된 Access Token을 Refresh Token으로 자동 갱신하고, Token State의 Client ID가 현재 `.env`와 다르면 재발급합니다(cwd에 `.env`가 없으면 저장된 토큰을 그대로 씁니다). 이때 경고가 함께 출력됩니다.

## 설정 우선순위

**플래그(`--lang`, `--timezone`) > 셸 환경변수 > cwd `.env` > Config File의 `ENVIRONMENTS` > 기본값**

- 환경변수 접두사는 `ARE_YOU_HAPPY_CLI_` (예: `ARE_YOU_HAPPY_CLI_LANG`, `ARE_YOU_HAPPY_CLI_TIMEZONE`)
- 기본값: 언어 `en`, 타임존은 시스템 타임존
- Client Credentials(`CLIENT_ID`, `CLIENT_SECRET`)는 이 우선순위를 따르지 않고 **cwd `.env`에서만** 읽습니다.
- 잘못된 `--lang`·`--timezone` 플래그는 `400`, 환경변수·Config File의 잘못된 값은 경고 후 기본값으로 대체합니다.
- 언어는 commander 정의 전에 해석되므로 `ARE_YOU_HAPPY_CLI_LANG=ko npx are-you-happy-cli --help`는 한국어로 나옵니다.

## 파일 위치와 권한

| 대상 | 경로 | 권한 |
|---|---|---|
| Config File | `$XDG_CONFIG_HOME/are-you-happy-cli/config.json`, 없으면 `~/.are-you-happy-cli/config.json` | 파일 600 / 폴더 700 |
| Client Credentials | CLI를 실행한 폴더(cwd)의 `.env`만 (상위 폴더 탐색 안 함) | 600 |
| Token State | `<config-dir>/token-dir/token.json` | 600 |

Config File 예:

```json
{
  "ENVIRONMENTS": {
    "ARE_YOU_HAPPY_CLI_LANG": "en",
    "ARE_YOU_HAPPY_CLI_TIMEZONE": "Asia/Seoul"
  },
  "mode": "CRAZY"
}
```

- `.env` 키: `ARE_YOU_HAPPY_CLI_CLIENT_ID`, `ARE_YOU_HAPPY_CLI_CLIENT_SECRET` (다른 키는 보존)
- 세 파일 모두 스키마 검증하며, 깨져 있으면 `400`과 재생성 안내를 냅니다. 권한이 600보다 넓으면 경고합니다.
- `.env`에는 비밀값이 들어가므로 저장소에 커밋하지 마세요.

## 출력과 종료 코드

- 포맷은 `action` 그룹에만 있습니다: `--format` 명시 > stdout이 TTY면 `text`, 아니면 `json`. 에이전트는 `action`을 호출할 때 `--format json`을 명시합니다. `config`·`auth`·`--help`·`--version`은 항상 `text`입니다([ADR-0003](docs/adr/0003-format-only-for-action.md)).
- `json`(`action`만): 성공·실패 모두 stdout에 봉투 한 번. 성공은 `{ code, message, data }`이고 경고는 `data.warnings`. 실패는 `{ code, message, reason, data }`이며 `data`는 `{ warnings }`다. `reason`은 언어와 무관한 코드(`config_invalid`, `token_invalid`, `no_credentials` 등)다. 오류도 stdout으로 내는 이유는 [ADR-0001](docs/adr/0001-json-envelope-on-stdout.md), 실패 모양은 [ADR-0004](docs/adr/0004-failure-warnings-and-reason.md) 참고.
- `text`: 결과는 stdout, 경고·오류는 stderr.

| `code` | 종료 코드 |
|---|---|
| 2xx | 0 |
| 400 | 2 |
| 401, 403 | 3 |
| 그 외 4xx·5xx | 1 (`500`은 버그 — `--verbose`로 stack trace 확인) |
| Ctrl+C | 130 |

## 개발

```sh
npm install
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # biome check
npm run build      # tsup → dist/cli.js
```

`npm install` 때 pre-commit 훅(simple-git-hooks)이 설치되어 커밋마다 staged 파일 biome 검사와 typecheck를 돌립니다. 리뷰 기준은 [`CODING_STANDARDS.md`](CODING_STANDARDS.md)에 있습니다.

PR과 `main` push마다 GitHub Actions(`.github/workflows/ci.yml`)가 Node 22·24·26에서 lint, typecheck, build, test를 돌립니다.

구조: `src/commands/`는 인자 파싱과 결과(`ctx.result`) 구성, `src/services/`는 TokenIssuer와 토큰 흐름, `src/settings/`의 store(Config File·`.env`·Token State)는 파일 읽기·검증·권한·저장을 맡고, 최종 출력(text/json 봉투)은 `src/output.ts`가 담당합니다. Language Pack은 `src/locales/en.ts`, `ko.ts`이며 `en`의 키 구조가 타입으로 강제됩니다.

## 템플릿으로 재사용하기: 주석 규칙

코드에는 두 가지 표식 주석이 있습니다. `grep -rn "CUSTOMIZE:\|SAMPLE:" src/`로 모두 찾을 수 있습니다.

### `// CUSTOMIZE:` — 새 CLI에 맞게 바꿀 지점

| 위치 | 내용 |
|---|---|
| `src/project.ts` | **Project Keyword**. 실행 파일명, Config File 폴더명, 환경변수 접두사가 모두 여기서 파생 |
| `src/errors.ts` | HTTP 스타일 status → 종료 코드 매핑(`httpStatusToExitCode`) |
| `src/settings/mask.ts` | 어떤 설정을 비밀로 보고 어떻게 마스킹할지 |
| `src/settings/resolve.ts` | CLI가 아는 Environment Setting 이름 목록. `API_URL`이 없으면 샘플 발급, 있으면 HTTP |
| `src/output.ts` | `--format`(json 봉투)을 갖는 명령 그룹(`FORMAT_GROUP`, 기본 `action`). 나머지 명령은 항상 text ([ADR-0003](docs/adr/0003-format-only-for-action.md)) |
| `src/services/sample-issuer.ts` | 샘플 Client Credentials(`happy-client` / `happy-secret`), Access Token·Refresh Token 상수와 TTL. `API_URL`이 없을 때의 `TokenIssuer` |
| `src/services/http-token-issuer.ts` | `ARE_YOU_HAPPY_CLI_API_URL`이 있을 때의 OAuth2 예. 경로(`oauth/token`), 타임아웃, 응답 스키마, 장애 status ([ADR-0007](docs/adr/0007-http-token-issuer.md)). Mood 조회는 이 URL을 쓰지 않음 |

### `// SAMPLE:` — 템플릿 전환 시 삭제할 Sample Action 코드

| 위치 | 내용 |
|---|---|
| `src/commands/action.ts` | `action are-you` 명령 (action 그룹 공통 가드와 `services/token-flow.ts`의 `callWithAccessToken`은 남김) |
| `src/services/sample-mood.ts` | Mood 엔드포인트(`MOODS`, `getMood`). `TokenIssuer` 밖 |
| `src/services/korean.ts` | 은/는 조사 선택 |
| `src/locales/en.ts`, `ko.ts` | `action.areYou` 문자열, 한국어 Mood |
| `test/action.test.ts`, `test/korean.test.ts` | Sample Action 테스트 (Mood·문장). 토큰 흐름 테스트 `test/token-flow.test.ts`는 남김 |

인증(`auth`)과 설정(`config`) 로직은 Sample Action에 속하지 않으므로 남겨 둡니다. 전환 후에는 `skills/are-you-happy-cli/SKILL.md`도 새 CLI에 맞게 고쳐 주세요.
