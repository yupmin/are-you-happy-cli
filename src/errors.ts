/** An expected failure: carries an HTTP-style status and an optional hint for the user. */
export class CliError extends Error {
  constructor(
    readonly status: number,
    message: string,
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
