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
  errors: {
    subcommandRequired: "A subcommand is required.",
    unexpected: "An unexpected error occurred.",
    rerunVerbose: "Run again with --verbose to see the stack trace.",
  },
};
