import { BIN_NAME as bin } from "../project";
// SAMPLE: Mood type for the action.areYou strings.
import type { Mood } from "../services/api";

export const en = {
  meta: { name: "English" },
  format: {
    dateTime: (date: Date, timeZone: string) =>
      `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(date)} (${timeZone})`,
  },
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
  $ ${bin} auth issue-token   # optional: action issues one when missing
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
    ok: "OK",
    version: "Version",
    help: "Help",
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
  auth: {
    client: {
      description: "register Client Credentials in the cwd .env (interactive only)",
      id: "ID",
      secret: "SECRET",
      required: "A value is required.",
      interactiveOnly: "auth client is interactive only; run it yourself in a terminal.",
      existing: (path: string) => `Client Credentials already exist in ${path}.`,
      saved: (path: string, id: string) => `Saved Client Credentials for "${id}" to ${path}`,
    },
    issueToken: {
      description: "issue an Access Token with the Client Credentials and save the Token State",
      noCredentials: "No Client Credentials found.",
      rejected: "The API rejected the Client Credentials.",
      issued: (expiresAt: string) => `Issued an Access Token (expires ${expiresAt}).`,
    },
    purgeToken: {
      description: "delete the Token State",
      purged: (path: string) => `Deleted the Token State: ${path}`,
      none: "There was no Token State to delete.",
    },
  },
  action: {
    configRequired: "No Config File found.",
    // SAMPLE: strings for action are-you.
    areYou: {
      description: "ask the API how <name> feels",
      name: "the person to ask about",
      message: (name: string, mood: Mood) => `${name} is ${mood}.`,
      text: (message: string, at: string) => `${message}\n${at}`,
    },
  },
  token: {
    issued: "No Token State found; issued a new Access Token.",
    invalid: "The Token State is not valid.",
    rejected: "The API rejected the Access Token.",
    refreshed: "The Access Token had expired; refreshed it.",
    reissued: "Refreshing the Access Token failed; re-issued it with the Client Credentials.",
    clientChanged: "The Token State was issued for a different Client ID; re-issued it.",
  },
  warnings: {
    overwritten: (path: string) => `Overwrote the existing ${path}.`,
    invalidTimezone: (value: string, fallback: string) =>
      `Invalid time zone "${value}"; using "${fallback}".`,
    tooOpen: (path: string) => `${path} is readable by others; run: chmod 600 "${path}"`,
    unsupportedLang: (value: string, fallback: string) =>
      `No Language Pack for "${value}"; falling back to "${fallback}".`,
  },
  hints: {
    runConfigInit: `Recreate it with \`${bin} config init\`.`,
    runAuthClient: `Register them with \`${bin} auth client\`.`,
    runIssueToken: `Issue a new one with \`${bin} auth issue-token\`.`,
    runConfigInitFirst: `Run \`${bin} config init\` first.`,
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
