import { BIN_NAME as bin } from "../project";
import { topicParticle } from "../services/korean";
import type { LanguagePack } from "./index";

// SAMPLE: Mood in Korean.
const MOODS_KO = {
  happy: "행복해",
  sad: "슬퍼",
  angry: "화나",
  excited: "신나",
  tired: "피곤해",
} as const;

export const ko: LanguagePack = {
  meta: { name: "한국어" },
  format: {
    dateTime: (date, timeZone) =>
      `${new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short", timeZone }).format(date)} (${timeZone})`,
  },
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
  $ ${bin} auth issue-token   # 선택: action이 없으면 자동 발급
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
    ok: "완료",
    version: "버전",
    help: "도움말",
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
    show: {
      description: "각 설정의 최종 값과 출처 표시",
      fileOnly: "파일 전용 설정",
      none: "(없음)",
    },
  },
  auth: {
    client: {
      description: "현재 폴더의 .env에 Client Credentials 등록 (대화형 전용)",
      id: "ID",
      secret: "SECRET",
      required: "값을 입력하세요.",
      interactiveOnly: "auth client는 대화형 전용입니다. 터미널에서 직접 실행하세요.",
      existing: (path) => `${path}에 이미 Client Credentials가 있습니다.`,
      saved: (path, id) => `"${id}" Client Credentials를 ${path}에 저장했습니다`,
    },
    issueToken: {
      description: "Client Credentials로 Access Token을 발급해 Token State로 저장",
      noCredentials: "Client Credentials가 없습니다.",
      rejected: "API가 Client Credentials를 거부했습니다.",
      issued: (expiresAt) => `Access Token을 발급했습니다 (만료: ${expiresAt}).`,
    },
    purgeToken: {
      description: "Token State 삭제",
      purged: (path) => `Token State를 삭제했습니다: ${path}`,
      none: "삭제할 Token State가 없습니다.",
    },
  },
  action: {
    configRequired: "설정 파일이 없습니다.",
    // SAMPLE: action are-you 문자열.
    areYou: {
      description: "<name>의 기분을 API에 묻기",
      name: "기분을 물어볼 사람",
      message: (name, mood) => `${name}${topicParticle(name)} ${MOODS_KO[mood]}`,
      text: (message, at) => `${message}\n${at}`,
    },
  },
  token: {
    issued: "Token State가 없어 Access Token을 새로 발급했습니다.",
    invalid: "Token State가 올바르지 않습니다.",
    rejected: "API가 Access Token을 거부했습니다.",
    refreshed: "Access Token이 만료되어 갱신했습니다.",
    reissued: "Access Token 갱신에 실패해 Client Credentials로 재발급했습니다.",
    clientChanged: "Token State가 다른 Client ID로 발급되어 재발급했습니다.",
  },
  warnings: {
    overwritten: (path) => `기존 ${path}을(를) 덮어썼습니다.`,
    invalidTimezone: (value, fallback) =>
      `잘못된 타임존 "${value}" 대신 "${fallback}"을 사용합니다.`,
    tooOpen: (path) => `${path}을(를) 다른 사용자가 읽을 수 있습니다. 실행: chmod 600 "${path}"`,
    unsupportedLang: (value, fallback) =>
      `"${value}" 언어 팩이 없어 "${fallback}"(으)로 대체합니다.`,
  },
  hints: {
    runConfigInit: `\`${bin} config init\`으로 다시 만드세요.`,
    runAuthClient: `\`${bin} auth client\`로 먼저 등록하세요.`,
    runIssueToken: `\`${bin} auth issue-token\`으로 새로 발급하세요.`,
    runConfigInitFirst: `\`${bin} config init\`을 먼저 실행하세요.`,
  },
  errors: {
    unsupportedLang: (value, supported) =>
      `지원하지 않는 언어 "${value}"입니다. 다음 중에서 고르세요: ${supported}.`,
    invalidTimezone: (value) => `잘못된 타임존 "${value}"입니다.`,
    configInvalid: (path) => `설정 파일이 올바르지 않습니다: ${path}`,
    dotenvInvalid: (path) => `.env 파일이 올바르지 않습니다: ${path}`,
    subcommandRequired: "하위 명령이 필요합니다.",
    unexpected: "예상치 못한 오류가 발생했습니다.",
    rerunVerbose: "--verbose 옵션으로 다시 실행하면 stack trace를 볼 수 있습니다.",
  },
};
