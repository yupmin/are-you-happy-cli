import { BIN_NAME as bin } from "../project";
import type { LanguagePack } from "./index";

export const ko: LanguagePack = {
  label: { warning: "경고:", error: "오류:", hint: "힌트:" },
  program: {
    description: "가상 API에 누군가의 기분을 물어봅니다. Agent Skill용 샘플 CLI입니다.",
    format: "출력 형식 (기본값: TTY면 text, 아니면 json)",
    verbose: "예상치 못한 오류의 stack trace 출력",
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
  warnings: {
    unsupportedLang: (value, fallback) =>
      `"${value}" 언어 팩이 없어 "${fallback}"(으)로 대체합니다.`,
  },
  errors: {
    subcommandRequired: "하위 명령이 필요합니다.",
    unexpected: "예상치 못한 오류가 발생했습니다.",
    rerunVerbose: "--verbose 옵션으로 다시 실행하면 stack trace를 볼 수 있습니다.",
  },
};
