import type { Ctx } from "./context";
import { CliError } from "./errors";
import { isTooOpen } from "./settings/private-file";

/** A Config File that exists but fails parsing or the schema is a 400. */
export function assertConfigReadable({ config, t, paths }: Ctx): void {
  if (config.status === "invalid") {
    throw new CliError(400, t.errors.configInvalid(paths.configFile), t.hints.runConfigInit);
  }
}

export function assertDotenvReadable({ dotenv, t, paths }: Ctx): void {
  if (dotenv.status === "invalid") {
    throw new CliError(400, t.errors.dotenvInvalid(paths.envFile), t.hints.runAuthClient);
  }
}

export function warnIfTooOpen({ out, t }: Ctx, ...files: string[]): void {
  for (const file of files) if (isTooOpen(file)) out.warn(t.warnings.tooOpen(file));
}
