import type { Ctx } from "../context";
import { CliError, REASON, type Reason } from "../errors";
import type { TokenState } from "../settings/token-state";
import { ApiError, type ClientCredentials, type TokenResponse } from "./token-issuer";

/** Runs `call`; an ApiError from the API becomes a CliError with the given message and hint. */
async function mapApiError<T>(
  call: () => Promise<T>,
  message: string,
  reason: Reason,
  hint: string,
): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ApiError) throw new CliError(err.status, message, reason, hint);
    throw err;
  }
}

/** Client Credentials from the cwd .env (the only place they may live), if complete. */
export function readClientCredentials(ctx: Ctx): ClientCredentials | undefined {
  ctx.dotenv.check(); // the values themselves arrive via settings (.env only)
  const clientId = ctx.settings.CLIENT_ID?.value;
  const clientSecret = ctx.settings.CLIENT_SECRET?.value;
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

function toTokenState(res: TokenResponse, clientId: string, now: Date): TokenState {
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    expiresAt: new Date(now.getTime() + res.expiresIn * 1000).toISOString(),
    clientId,
  };
}

const isExpired = (state: TokenState, now: Date): boolean =>
  Date.parse(state.expiresAt) <= now.getTime();

function save(ctx: Ctx, state: TokenState): TokenState {
  ctx.tokenState.save(state);
  return state;
}

/** Issues a token with the Client Credentials and saves it. Throws 401 CliErrors. */
export async function issueAndSave(
  ctx: Ctx,
  creds = readClientCredentials(ctx),
): Promise<TokenState> {
  const { t, io } = ctx;
  if (!creds) {
    throw new CliError(
      401,
      t.auth.issueToken.noCredentials,
      REASON.noCredentials,
      t.hints.runAuthClient,
    );
  }
  const res = await mapApiError(
    () => ctx.issuer.issueToken(creds),
    t.auth.issueToken.rejected,
    REASON.credentialsRejected,
    t.hints.runAuthClient,
  );
  return save(ctx, toTokenState(res, creds.clientId, io.now()));
}

/**
 * The Access Token to call the API with. Read only from the Token State, never from env.
 * No Token State → issue one; a valid one is reused until its TTL runs out.
 * A Token State for another Client ID than the cwd .env → re-issue (no .env → nothing to compare).
 * Expired → refresh, then re-issue.
 */
export async function getAccessToken(ctx: Ctx): Promise<string> {
  const { t, io, out } = ctx;
  const state = ctx.tokenState.read();
  if (!state) return issueWithWarning(ctx, readClientCredentials(ctx), t.token.issued);

  const creds = readClientCredentials(ctx);
  if (creds && creds.clientId !== state.clientId) {
    return issueWithWarning(ctx, creds, t.token.clientChanged);
  }
  if (!isExpired(state, io.now())) return state.accessToken;

  try {
    const res = await ctx.issuer.refreshAccessToken(state.refreshToken);
    const refreshed = save(ctx, toTokenState(res, state.clientId, io.now()));
    out.warn(t.token.refreshed);
    return refreshed.accessToken;
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }
  return issueWithWarning(ctx, creds, t.token.reissued);
}

/** Issues a new Access Token, saves it and warns why. */
async function issueWithWarning(ctx: Ctx, creds: ClientCredentials | undefined, why: string) {
  const issued = await issueAndSave(ctx, creds);
  ctx.out.warn(why);
  return issued.accessToken;
}

/** Calls the API with a usable Access Token; an API rejection becomes a 401 CliError. */
export async function callWithAccessToken<T>(
  ctx: Ctx,
  call: (accessToken: string) => Promise<T>,
): Promise<T> {
  const accessToken = await getAccessToken(ctx);
  return mapApiError(
    () => call(accessToken),
    ctx.t.token.rejected,
    REASON.tokenRejected,
    ctx.t.hints.runIssueToken,
  );
}
