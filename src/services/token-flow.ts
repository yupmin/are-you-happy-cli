import type { Ctx } from "../context";
import { CliError } from "../errors";
import { warnIfTooOpen } from "../guards";
import { loadTokenState } from "./token-state";

/** The Access Token to call the API with. Read only from the Token State, never from env. */
export async function getAccessToken(ctx: Ctx): Promise<string> {
  const { t, paths } = ctx;
  const load = loadTokenState(paths.tokenFile);
  if (load.status === "missing") throw new CliError(401, t.token.missing, t.hints.runIssueToken);
  if (load.status === "invalid") throw new CliError(400, t.token.invalid, t.hints.runIssueToken);
  warnIfTooOpen(ctx, paths.tokenFile);
  return load.state.accessToken;
}
