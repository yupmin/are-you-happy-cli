import { BIN_NAME as bin } from "../project";
import type { LanguagePack } from "./index";

export const ko: LanguagePack = {
  meta: { name: "한국어" },
  label: { warning: "경고:", error: "오류:", hint: "힌트:" },
  program: {
    description: "가상 API에 누군가의 기분을 물어봅니다. Agent Skill용 샘플 CLI입니다.",
    format: "출력 형식 (기본값: TTY면 text, 아니면 json)",
    verbose: "예상치 못한 오류의 stack trace 출력",
    lang: "언어 (ARE_YOU_HAPPY_CLI_LANG보다 우선)",
    timezone: "IANA 타임존 (ARE_YOU_HAPPY_CLI_TIMEZONE보다 우선)",
    version: "버전 출력",
    help: "도움말 표시",
    helpCommand: "명령 도움말 표시",
    examples: `
예시:
  $ ${bin} config init
  $ ${bin} action are-you 민수

에이전트용:
  $ ${bin} action are-you 민수 --format json`,
  },
  groups: {
    config: "설정 파일 관리",
    auth: "Client Credentials와 Access Token 관리",
    action: "API를 호출하는 샘플 명령",
  },
  examples: {
    config: `
예시:
  $ ${bin} config init
  $ ${bin} config init --lang ko --timezone Asia/Seoul
  $ ${bin} config show

에이전트용:
  $ ${bin} config show --format json`,
    auth: `
예시:
  $ ${bin} auth client
  $ ${bin} auth issue-token
  $ ${bin} auth purge-token

에이전트용:
  $ ${bin} auth issue-token --format json`,
    action: `
예시:
  $ ${bin} action are-you 민수

에이전트용:
  $ ${bin} action are-you 민수 --format json`,
  },
  common: {
    overwrite: "이미 값이 있습니다. 덮어쓸까요?",
    cancelled: "취소했습니다. 변경된 것은 없습니다.",
  },
  config: {
    init: {
      description: "언어와 타임존을 골라 설정 파일에 저장",
      language: "언어",
      timezone: "타임존",
      timezoneSystem: (tz) => `시스템 타임존 사용 (${tz})`,
      timezoneCustom: "직접 입력",
      timezoneInput: "IANA 타임존 (예: Asia/Seoul)",
      confirmSave: (path) => `${path}에 저장할까요?`,
      saved: (path) => `설정 파일을 저장했습니다: ${path}`,
      needFlags: "TTY가 아니므로 --lang과 --timezone을 모두 지정하세요.",
    },
  },
  warnings: {
    overwritten: (path) => `기존 ${path}을(를) 덮어썼습니다.`,
    unsupportedLang: (value, fallback) =>
      `"${value}" 언어 팩이 없어 "${fallback}"(으)로 대체합니다.`,
  },
  errors: {
    unsupportedLang: (value, supported) =>
      `지원하지 않는 언어 "${value}"입니다. 다음 중에서 고르세요: ${supported}.`,
    invalidTimezone: (value) => `잘못된 타임존 "${value}"입니다.`,
    subcommandRequired: "하위 명령이 필요합니다.",
    unexpected: "예상치 못한 오류가 발생했습니다.",
    rerunVerbose: "--verbose 옵션으로 다시 실행하면 stack trace를 볼 수 있습니다.",
  },
};
