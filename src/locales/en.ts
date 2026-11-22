import { BIN_NAME as bin } from "../project";

export const en = {
  meta: { name: "English" },
  label: { warning: "Warning:", error: "Error:", hint: "Hint:" },
  program: {
    description: "Ask a virtual API how someone feels. A sample CLI for Agent Skills.",
    format: "output format (default: text on a TTY, json otherwise)",
    verbose: "print stack traces for unexpected errors",
    lang: "language (overrides ARE_YOU_HAPPY_CLI_LANG)",
    timezone: "IANA time zone (overrides ARE_YOU_HAPPY_CLI_TIMEZONE)",
    version: "print the version",
    help: "display help",
    helpCommand: "display help for a command",
    examples: `
Examples:
  $ ${bin} config init
  $ ${bin} action are-you Minsu

For agents:
  $ ${bin} action are-you Minsu --format json`,
  },
  groups: {
    config: "manage the Config File",
    auth: "manage Client Credentials and the Access Token",
    action: "sample actions that call the API",
  },
  examples: {
    config: `
Examples:
  $ ${bin} config init
  $ ${bin} config init --lang ko --timezone Asia/Seoul
  $ ${bin} config show

For agents:
  $ ${bin} config show --format json`,
    auth: `
Examples:
  $ ${bin} auth client
  $ ${bin} auth issue-token
  $ ${bin} auth purge-token

For agents:
  $ ${bin} auth issue-token --format json`,
    action: `
Examples:
  $ ${bin} action are-you Minsu

For agents:
  $ ${bin} action are-you Minsu --format json`,
  },
  common: {
    overwrite: "A value already exists. Overwrite it?",
    cancelled: "Cancelled. Nothing was changed.",
  },
  config: {
    init: {
      description: "choose a language and time zone and save them to the Config File",
      language: "Language",
      timezone: "Time zone",
      timezoneSystem: (tz: string) => `Use the system time zone (${tz})`,
      timezoneCustom: "Enter one",
      timezoneInput: "IANA time zone (e.g. Asia/Seoul)",
      confirmSave: (path: string) => `Save to ${path}?`,
      saved: (path: string) => `Saved the Config File: ${path}`,
      needFlags: "Not a TTY: pass both --lang and --timezone.",
    },
    show: {
      description: "show every setting with its final value and where it came from",
      fileOnly: "File-only Settings",
      none: "(none)",
    },
  },
  warnings: {
    overwritten: (path: string) => `Overwrote the existing ${path}.`,
    tooOpen: (path: string) => `${path} is readable by others; run: chmod 600 "${path}"`,
    unsupportedLang: (value: string, fallback: string) =>
      `No Language Pack for "${value}"; falling back to "${fallback}".`,
  },
  hints: {
    runConfigInit: `Recreate it with \`${bin} config init\`.`,
    runAuthClient: `Register them with \`${bin} auth client\`.`,
  },
  errors: {
    unsupportedLang: (value: string, supported: string) =>
      `Unsupported language "${value}". Choose one of: ${supported}.`,
    invalidTimezone: (value: string) => `Invalid time zone "${value}".`,
    configInvalid: (path: string) => `The Config File is not valid: ${path}`,
    dotenvInvalid: (path: string) => `The .env file is not valid: ${path}`,
    subcommandRequired: "A subcommand is required.",
    unexpected: "An unexpected error occurred.",
    rerunVerbose: "Run again with --verbose to see the stack trace.",
  },
};
