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

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

/** Runs `call`; an ApiError from the API becomes a CliError with the given message and hint. */
async function mapApiError<T>(call: () => Promise<T>, message: string, hint: string): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ApiError) throw new CliError(err.status, message, hint);
    throw err;
  }
}

/** Client Credentials from the cwd .env (the only place they may live), if complete. */
export function readClientCredentials(ctx: Ctx): ClientCredentials | undefined {
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
export async function issueAndSave(
  ctx: Ctx,
  creds = readClientCredentials(ctx),
): Promise<TokenState> {
  const { t, io } = ctx;
  if (!creds) throw new CliError(401, t.auth.issueToken.noCredentials, t.hints.runAuthClient);
  const res = await mapApiError(
    () => api.issueToken(creds.clientId, creds.clientSecret),
    t.auth.issueToken.rejected,
    t.hints.runAuthClient,
  );
  return save(ctx, toTokenState(res, creds.clientId, io.now()));
}

/**
 * The Access Token to call the API with. Read only from the Token State, never from env.
 * A Token State for another Client ID than the cwd .env → re-issue (no .env → nothing to compare).
 * Expired → refresh, then re-issue.
 */
export async function getAccessToken(ctx: Ctx): Promise<string> {
  const { t, io, out, paths } = ctx;
  const load = loadTokenState(paths.tokenFile);
  if (load.status === "missing") throw new CliError(401, t.token.missing, t.hints.runIssueToken);
  if (load.status === "invalid") throw new CliError(400, t.token.invalid, t.hints.runIssueToken);
  warnIfTooOpen(ctx, paths.tokenFile);

  const { state } = load;
  const creds = readClientCredentials(ctx);
  if (creds && creds.clientId !== state.clientId) {
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

/** Calls the API with a usable Access Token; an API rejection becomes a 401 CliError. */
export async function callWithAccessToken<T>(
  ctx: Ctx,
  call: (accessToken: string) => Promise<T>,
): Promise<T> {
  const accessToken = await getAccessToken(ctx);
  return mapApiError(() => call(accessToken), ctx.t.token.rejected, ctx.t.hints.runIssueToken);
}
