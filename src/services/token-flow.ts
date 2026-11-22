import type { Ctx } from "../context";
import { CliError } from "../errors";
import { assertDotenvReadable, warnIfTooOpen } from "../guards";
import * as api from "./api";
import { ApiError } from "./api";
import {
  isExpired,
  loadTokenState,
  saveTokenState,
  type TokenState,
  toTokenState,
} from "./token-state";

export interface Credentials {
  clientId: string;
  clientSecret: string;
}

/** Client Credentials from the resolved settings (shell env > cwd .env), if complete. */
export function readCredentials(ctx: Ctx): Credentials | undefined {
  assertDotenvReadable(ctx);
  warnIfTooOpen(ctx, ctx.paths.envFile);
  const clientId = ctx.settings.CLIENT_ID?.value;
  const clientSecret = ctx.settings.CLIENT_SECRET?.value;
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

function save(ctx: Ctx, state: TokenState): TokenState {
  const { paths } = ctx;
  saveTokenState(paths.tokenFile, [paths.configDir, paths.tokenDir], state);
  return state;
}

/** Issues a token with the Client Credentials and saves it. Throws 401 CliErrors. */
export async function issueAndSave(ctx: Ctx, creds = readCredentials(ctx)): Promise<TokenState> {
  const { t, io } = ctx;
  if (!creds) throw new CliError(401, t.auth.issueToken.noCredentials, t.hints.runAuthClient);
  try {
    const res = await api.issueToken(creds.clientId, creds.clientSecret);
    return save(ctx, toTokenState(res, creds.clientId, io.now()));
  } catch (err) {
    if (err instanceof ApiError) {
      throw new CliError(err.status, t.auth.issueToken.rejected, t.hints.runAuthClient);
    }
    throw err;
  }
}

/**
 * The Access Token to call the API with. Read only from the Token State, never from env.
 * A Token State for another Client ID is invalid → re-issue. Expired → refresh, then re-issue.
 */
export async function getAccessToken(ctx: Ctx): Promise<string> {
  const { t, io, out, paths } = ctx;
  const load = loadTokenState(paths.tokenFile);
  if (load.status === "missing") throw new CliError(401, t.token.missing, t.hints.runIssueToken);
  if (load.status === "invalid") throw new CliError(400, t.token.invalid, t.hints.runIssueToken);
  warnIfTooOpen(ctx, paths.tokenFile);

  const { state } = load;
  const creds = readCredentials(ctx);
  if (creds?.clientId !== state.clientId) {
    const issued = await issueAndSave(ctx, creds);
    out.warn(t.token.clientChanged);
    return issued.accessToken;
  }
  if (!isExpired(state, io.now())) return state.accessToken;

  try {
    const res = await api.refreshAccessToken(state.refreshToken);
    const refreshed = save(ctx, toTokenState(res, state.clientId, io.now()));
    out.warn(t.token.refreshed);
    return refreshed.accessToken;
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }
  const issued = await issueAndSave(ctx, creds);
  out.warn(t.token.reissued);
  return issued.accessToken;
}
