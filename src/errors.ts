/**
 * Language-independent failure ids for the JSON envelope (ADR-0004).
 * The human message stays in the Language Pack; agents switch on `reason`.
 */
export const REASON = {
  configMissing: "config_missing",
  configInvalid: "config_invalid",
  dotenvInvalid: "dotenv_invalid",
  tokenInvalid: "token_invalid",
  noCredentials: "no_credentials",
  credentialsRejected: "credentials_rejected",
  tokenRejected: "token_rejected",
  unsupportedLang: "unsupported_lang",
  invalidTimezone: "invalid_timezone",
  invalidApiUrl: "invalid_api_url",
  interactiveOnly: "interactive_only",
  noninteractive: "noninteractive",
  usage: "usage",
  unexpected: "unexpected",
} as const;

export type Reason = (typeof REASON)[keyof typeof REASON];

/** An expected failure: HTTP-style status, stable reason, optional hint for the user. */
export class CliError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reason: Reason,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export const EXIT_INTERRUPTED = 130;

// CUSTOMIZE: the single mapping from HTTP-style status to process exit code.
export function httpStatusToExitCode(status: number): number {
  if (status >= 200 && status < 300) return 0;
  if (status === 400) return 2;
  if (status === 401 || status === 403) return 3;
  return 1;
}

/** Ctrl+C inside an @inquirer prompt. */
export function isPromptExit(err: unknown): boolean {
  return err instanceof Error && err.name === "ExitPromptError";
}
