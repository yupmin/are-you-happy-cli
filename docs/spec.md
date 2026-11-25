# are-you-happy-cli 스펙

Agent Skill에서 호출하는 CLI 샘플. 가상 API(are.you.happy.cli)에 **Access Token**을 보내 이름에 대한 **Mood**를 받는다. 추후 **Sample Action**(`action are-you`)을 삭제하고 auth·config 로직을 재활용해 다른 CLI를 만드는 템플릿이 목적이다. 용어는 `GLOSSARY.md`를 따른다.

## 툴체인

- TypeScript(ESM), Node ≥ 22 (`engines`), npm
- `@commander-js/extra-typings`, `@inquirer/prompts`, `zod`
- 빌드 `tsup` (shebang 포함 단일 ESM), 테스트 `vitest`, 린트/포맷 `biome`
- 배포: npm `are-you-happy-cli`, 사용은 `npx are-you-happy-cli` (배포는 별도 단계)

## 식별자

- **Project Keyword**: `are-you-happy-cli` — `src/project.ts` 단일 정의 (`// CUSTOMIZE:`)
- 실행 파일명 `are-you-happy-cli`, 환경변수 접두사 `ARE_YOU_HAPPY_CLI_`

## 파일과 경로

| 대상 | 경로 | 권한 |
|---|---|---|
| Config File | `$XDG_CONFIG_HOME/are-you-happy-cli/config.json`, 없으면 `~/.are-you-happy-cli/config.json` | 파일 600 / 폴더 700 |
| Client Credentials | CLI 실행 폴더(cwd)의 `.env`만 — 상위 탐색 안 함 | 600 |
| Token State | `<config-dir>/token-dir/token.json` (`<subject>-dir/<subject>.json` 규칙) | 600 |

Config File 형식:

```json
{
  "ENVIRONMENTS": {
    "ARE_YOU_HAPPY_CLI_LANG": "en",
    "ARE_YOU_HAPPY_CLI_TIMEZONE": "Asia/Seoul"
  },
  "mode": "CRAZY"
}
```

- `ENVIRONMENTS` 안은 **Environment Setting**, 밖(`mode`)은 **File-only Setting**. `mode`는 예시이며 동작 영향 없음.
- `.env` 키: `ARE_YOU_HAPPY_CLI_CLIENT_ID`, `ARE_YOU_HAPPY_CLI_CLIENT_SECRET`. 기존 다른 키는 보존.
- `token.json`: `{ accessToken, refreshToken, expiresAt, clientId }`. Access Token은 이 파일에서만 읽는다(환경변수 주입 불가).
- 세 파일 모두 `zod`로 검증. 파싱/스키마 실패 → `400` + 재생성 안내. 권한이 600보다 넓으면 경고.

## 설정 해석

- 우선순위: **플래그 > 셸 환경변수 > cwd `.env` > `config.json`의 `ENVIRONMENTS` > 기본값**
- commander 정의 **전에** 설정을 해석해 언어를 정한다 → `ARE_YOU_HAPPY_CLI_LANG=en are-you-happy-cli --help`는 영어.
- 기본값: 언어 `en`, 타임존 = 시스템 타임존.
- 플래그의 잘못된 `--lang`·`--timezone`은 `400`. 셸 환경변수·cwd `.env`·Config File의 잘못된 언어(Language Pack 없음)나 타임존은 경고 후 기본값으로 대체한다. 더 낮은 층의 유효한 값으로 내려가지 않는다.

## 명령

전역 옵션: `--verbose`, `--version`, `-h/--help`. `--format <text|json>`은 `action` 그룹 옵션 ([ADR-0003](adr/0003-format-only-for-action.md))

| 명령 | 동작 |
|---|---|
| `config init` | 언어 선택(존재하는 **Language Pack**만: en, ko) → 타임존(시스템 사용 또는 직접 입력, `Intl`로 검증) → 확인 후 저장. 플래그 `--lang`, `--timezone`로 비대화형 실행 가능. 기존 값 덮어쓰기 시 경고 |
| `config show` | 검증을 거친 최종 설정값과 출처(flag / shell env / .env / config.json / default). 언어·타임존이 기본값으로 대체되면 출처는 `default`이고, 경고가 버린 원문을 알린다. 키에 `SECRET`·`TOKEN` 포함 시 앞 4자 + `****` 마스킹. Client ID는 노출. 마스킹 규칙은 `// CUSTOMIZE:` 함수 하나 |
| `auth client` | **대화형 전용.** `ID:` 입력 → `SECRET:` 입력(화면에 비표시) → `.env` 저장. 플래그 없음. 비TTY면 `400`. 기존 값 덮어쓰기 시 경고 |
| `auth issue-token` | `.env`의 Client Credentials를 고정값(`happy-client` / `happy-secret`, `// CUSTOMIZE:`)과 비교, 불일치 시 `401`. 성공 시 Token State 저장 |
| `auth purge-token` | Token State 삭제 |
| `action are-you <name>` | (`// SAMPLE:`) 무작위 Mood 반환 + 설정 타임존 기준 날짜·시간 표시 |

### 덮어쓰기 경고

- TTY: "이미 값이 있습니다. 덮어쓸까요?" 확인
- 비TTY: 덮어쓰고 stderr에 경고
- `--yes`, `--no-input`은 두지 않는다

`auth client`·`config init`의 TTY/비TTY 분기와 확인·취소 처리는 아래 **대화형 명령 흐름** 헬퍼로 구현한다. 동작은 이 절과 명령 표의 문장과 같아야 한다.

### 대화형 명령 흐름

쓰기·확인이 있는 명령이 공유하는 분기는 `src/commands/flows.ts`에 둔다. 도메인 프롬프트(입력 문구, timezone 선택, credential 키 존재 여부 판단)는 각 `commands/*.ts`에 남긴다. `services/`로 옮기지 않는다 (명령 UX 흐름이므로 [ADR-0002](adr/0002-commands-build-result-output-renders.md)의 `commands/` 책임).

반환 타입 `Proceed`는 `"proceed"` | `"cancelled"`이다. `"cancelled"`는 `cancel(ctx)`로 `ctx.result = { message: common.cancelled }`가 이미 설정된 상태를 뜻한다.

| 함수 | 역할 |
|---|---|
| `requireInteractive(ctx, fail)` | `!ctx.io.interactive`이면 `CliError(400, fail.message, fail.reason)` |
| `requireWhenNonInteractive(ctx, ok, fail)` | `!interactive && !ok`일 때만 위와 같이 throw (대화형이면 검사 안 함) |
| `confirmOrCancel(ctx, { message, default })` | `prompt.confirm` → 거부 시 `cancel(ctx)` 후 `"cancelled"`, 수락 시 `"proceed"` |
| `beforeOverwriteExistingFile(ctx, { exists, path, overwrittenWarning })` | `exists`가 거짓이면 `"proceed"`. 참이면 TTY에서는 `t.common.overwrite`로 `confirmOrCancel`(`default: false`). 비TTY면 `overwrittenWarning`을 stderr 경고 한 번 후 `"proceed"` (`path`는 호출부 문맥용; 경고 문장은 Language Pack) |

적용:

- `auth client`: `requireInteractive` + credential 키가 이미 있으면 기존처럼 경고 후 `confirmOrCancel`(`t.common.overwrite`). 이후 input/password는 명령에 둔다.
- `config init`: 비대화형일 때 `--lang`·`--timezone` 둘 다 없으면 `requireWhenNonInteractive` + `reason: noninteractive`. Config File이 있으면 `beforeOverwriteExistingFile`. 없고 TTY이면 `confirmOrCancel`(`t.config.init.confirmSave(path)`, `default: true`) — 이 확인은 덮어쓰기 헬퍼에 넣지 않는다.

새 CLI 템플릿에서 비슷한 쓰기 명령을 추가할 때도 같은 헬퍼를 쓴다. 별도 명령 레지스트리나 DI는 두지 않는다 ([ADR-0006](adr/0006-seams-not-taken.md)).

### action 가드

`action` 그룹 공통 가드: Config File이 없으면 `400`(종료 코드 2) + "`config init`을 먼저 실행하라". 다른 명령은 Config File 없이도 기본값으로 동작.

## 가상 API

- `ARE_YOU_HAPPY_CLI_API_URL`이 없으면 프로세스 내 샘플 `TokenIssuer`로 발급·갱신한다 (`services/sample-issuer.ts`, [ADR-0005](adr/0005-token-issuer-port.md)). 토큰 흐름은 `Ctx.issuer`만 부른다
- 그 값이 있으면 HTTP adapter가 `{base}/oauth/token`에 발급은 `client_credentials`, 갱신은 `refresh_token`으로 POST한다 (`services/http-token-issuer.ts`, [ADR-0007](adr/0007-http-token-issuer.md)). 응답은 `access_token`, `refresh_token`, `expires_in`(정수 초). 갱신 응답에 `refresh_token`이 없으면 보낸 값을 유지한다
- URL은 사용자 정보가 없는 절대 http(s)여야 한다. 검사는 발급·갱신할 때만 한다. 아니면 샘플로 내려가지 않고 `400` / `invalid_api_url`(`CliError`, 재발급하지 않음). 값은 실패 메시지에 넣지 않는다. `config show`는 잘못된 값도 보여 주고, `--help`는 그대로 동작한다
- HTTP 상태는 `ApiError` status가 된다. 리다이렉트는 따라가지 않고 그 status를 쓴다. 타임아웃 `504`, 네트워크 실패 `503`, 잘못된 본문 `502`. `reason`은 토큰 흐름이 정한다
- Access Token 상수 `it.me.and.you`, Refresh Token 상수 `it.me.and.you.again`, TTL 3600초 (`// CUSTOMIZE:`)
- 샘플 발급 응답: `{ accessToken, refreshToken, expiresIn }`
- Mood 조회는 Sample Action 전용 (`services/sample-mood.ts`)이며 HTTP로 나가지 않는다. `API_URL`만 켜면 발급된 Access Token이 샘플 상수와 달라 `action are-you`는 `401`이다. 템플릿 전환 시 이 조회를 지우고 `callWithAccessToken` 콜백을 바꾼다

### 토큰 흐름 (action 실행 시)

1. Token State 없음 → Client Credentials로 자동 발급 + 경고 (Client Credentials도 없으면 `401` + `auth client` 안내). 유효한 Token State는 TTL 동안 재사용
2. 저장된 `clientId` ≠ 현재 `.env`의 Client ID → 무효로 취급
3. 만료 → Refresh Token으로 갱신 → `ApiError`면 Client Credentials로 재발급 → 실패 시 `401`. `ApiError`가 아닌 실패(잘못된 `API_URL` 포함)는 재발급하지 않고 그대로 올라간다

## Mood

`happy`, `sad`, `angry`, `excited`, `tired`

- ko: 행복해, 슬퍼, 화나, 신나, 피곤해 — 이름 받침에 따라 은/는 자동 선택 (민수는 / 영진은)
- en: "Minsu is happy."

## 출력

- 포맷 결정(`action` 그룹만): `--format` 명시 > stdout이 TTY면 `text`, 아니면 `json`. 에이전트는 SKILL.md 지침대로 `action` 호출에 `--format json` 명시. 그 밖의 명령(`config`·`auth`·`--help`·`--version`)은 항상 `text` ([ADR-0003](adr/0003-format-only-for-action.md)).
- json: stdout에 봉투 한 번 (ADR-0001, [ADR-0004](adr/0004-failure-warnings-and-reason.md))
  - 성공: `{ code, message, data }`. `data.warnings`는 경고 배열(없으면 `[]`)
  - 실패: `{ code, message, reason, data }`. `data`는 `{ warnings }`이고 `null`이 아니다. `reason`은 언어와 무관한 실패 코드다. `message`는 Language Pack 문장이고, hint가 있으면 한 칸 뒤에 붙는다
  - `reason`: `config_missing`, `config_invalid`, `dotenv_invalid`, `token_invalid`, `no_credentials`, `credentials_rejected`, `token_rejected`, `unsupported_lang`, `invalid_timezone`, `invalid_api_url`, `interactive_only`, `noninteractive`, `usage`, `unexpected`. json 실패 봉투에만 있다. `interactive_only`·`noninteractive`는 text 전용 명령(`auth client`, `config init`)이라 봉투에 나오지 않는다.
  - `code`: HTTP 스타일 숫자(`200`, `400`, `401`, `500`)
  - 시각은 ISO8601 + 설정 타임존 오프셋 (`2026-11-22T23:10:00+09:00`)
  - 색상·ANSI 없음
- text: 결과 stdout, 경고·오류 stderr. 시각은 Language Pack 형식.
- 색상: `util.styleText`, `NO_COLOR`/`FORCE_COLOR` 존중, 비TTY에서 끔.

## 오류와 종료 코드

- `httpStatusToExitCode()` 단일 매핑 (`// CUSTOMIZE:`): `2xx→0`, `400→2`, `401·403→3`, 그 외 `4xx·5xx→1`, Ctrl+C `130`
- `CliError`(예상된 오류, status·`reason`·hint 보유) vs 버그(예상 못한 오류: `reason`은 `unexpected`, `--verbose` 시 stack trace, 아니면 힌트)
- commander 오류는 `exitOverride()`로 가로채 `400`/종료 코드 2/`reason: usage`로 통일, json 모드면 봉투 출력. `showHelpAfterError`는 text 모드만. commander 내장 메시지는 번역하지 않음.
- `ExitPromptError`(프롬프트 중 Ctrl+C) → 조용히 130
- `process.exit()` 금지, `process.exitCode` 사용, `parseAsync()` 사용

## i18n

- `src/locales/en.ts`, `ko.ts`. `en` 키 구조를 타입으로 강제(`ko` 누락 시 컴파일 오류)
- 선택 가능한 언어 = 등록된 Language Pack 목록에서 자동 생성
- Language Pack이 없는 값(`ja` 등) → `en`으로 대체 + 경고
- 도움말 예시(`addHelpText`, 사람용 + `action`만 `--format json` 에이전트용)도 Language Pack에 둔다

## 구조

- `commands/`: 인자 파싱과 결과(`ctx.result`) 구성. 명령 간 TTY·확인·취소 분기는 `commands/flows.ts`. `services/`·`settings/`: 명령 사이에 공유되는 도메인·파일 로직, 출력은 `src/output.ts`가 담당 ([ADR-0002](adr/0002-commands-build-result-output-renders.md))
- 수정 가능 지점 `// CUSTOMIZE: <설명>`, 템플릿 전환 시 삭제 대상 `// SAMPLE:`

## 테스트

- services 단위 테스트(무작위는 주입 가능하게)
- 토큰 발급·재사용·갱신·갱신 실패 후 재발급·Client ID 변경은 대본 `TokenIssuer`로 `issueAndSave`/`getAccessToken`을 검증한다. 두지 않은 seam은 [ADR-0006](adr/0006-seams-not-taken.md)
- commands는 `exitOverride` + `configureOutput`으로 출력 캡처
- Sample Action이 Access Token을 거절하는 401은 `token.json`을 직접 변조해 검증

## Skill

`skills/are-you-happy-cli/SKILL.md`

- `action` 호출에 `--format json` 명시. `config`·`auth`는 text뿐이므로 종료 코드로 판단
- Client Credentials가 없으면 사용자에게 `! npx are-you-happy-cli auth client`를 직접 실행하도록 요청 (에이전트는 실행 불가)

## 범위 밖

템플릿 전환 가이드, `.gitignore` 경고, `--yes`/`--no-input`, table/csv 포맷, 셸 자동완성, 업데이트 알림
