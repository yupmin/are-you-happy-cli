import { BIN_NAME as bin } from "../project";

export const en = {
  label: { warning: "Warning:", error: "Error:", hint: "Hint:" },
  program: {
    description: "Ask a virtual API how someone feels. A sample CLI for Agent Skills.",
    format: "output format (default: text on a TTY, json otherwise)",
    verbose: "print stack traces for unexpected errors",
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
  warnings: {
    unsupportedLang: (value: string, fallback: string) =>
      `No Language Pack for "${value}"; falling back to "${fallback}".`,
  },
  errors: {
    subcommandRequired: "A subcommand is required.",
    unexpected: "An unexpected error occurred.",
    rerunVerbose: "Run again with --verbose to see the stack trace.",
  },
};
