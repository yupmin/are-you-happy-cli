import type { Command } from "@commander-js/extra-typings";
import type { Ctx } from "../context";
import { CliError } from "../errors";
import { assertDotenvReadable, warnIfTooOpen } from "../guards";
import { envKey } from "../project";
import * as api from "../services/api";
import { ApiError } from "../services/api";
import {
  deleteTokenState,
  saveTokenState,
  type TokenState,
  toTokenState,
} from "../services/token-state";
import { updateDotenv } from "../settings/dotenv";
import { maskValue } from "../settings/mask";
import { formatIsoInTimeZone } from "../time";

export const CLIENT_ID_KEY = envKey("CLIENT_ID");
export const CLIENT_SECRET_KEY = envKey("CLIENT_SECRET");

export function registerAuth(group: Command, ctx: Ctx): void {
  group
    .command("client")
    .description(ctx.t.auth.client.description)
    .action(() => authClient(ctx));

  group
    .command("issue-token")
    .description(ctx.t.auth.issueToken.description)
    .action(() => authIssueToken(ctx));

  group
    .command("purge-token")
    .description(ctx.t.auth.purgeToken.description)
    .action(() => authPurgeToken(ctx));
}

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

/** Issues a token with the Client Credentials and saves it. Throws 401 CliErrors. */
export async function issueAndSave(ctx: Ctx): Promise<TokenState> {
  const { t, io, paths } = ctx;
  const creds = readCredentials(ctx);
  if (!creds) throw new CliError(401, t.auth.issueToken.noCredentials, t.hints.runAuthClient);
  try {
    const res = await api.issueToken(creds.clientId, creds.clientSecret);
    const state = toTokenState(res, creds.clientId, io.now());
    saveTokenState(paths.tokenFile, [paths.configDir, paths.tokenDir], state);
    return state;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new CliError(err.status, t.auth.issueToken.rejected, t.hints.runAuthClient);
    }
    throw err;
  }
}

async function authIssueToken(ctx: Ctx): Promise<void> {
  const { t, timezone } = ctx;
  const state = await issueAndSave(ctx);
  const expiresAt = new Date(state.expiresAt);
  ctx.result = {
    message: t.auth.issueToken.issued(formatIsoInTimeZone(expiresAt, timezone)),
    text: t.auth.issueToken.issued(t.format.dateTime(expiresAt, timezone)),
    data: {
      accessToken: maskValue(state.accessToken),
      refreshToken: maskValue(state.refreshToken),
      expiresAt: formatIsoInTimeZone(expiresAt, timezone),
      clientId: state.clientId,
    },
  };
}

function authPurgeToken(ctx: Ctx): void {
  const { t, out, paths } = ctx;
  const deleted = deleteTokenState(paths.tokenFile);
  if (!deleted) out.warn(t.auth.purgeToken.none);
  ctx.result = {
    message: deleted ? t.auth.purgeToken.purged(paths.tokenFile) : t.auth.purgeToken.none,
    data: { deleted, tokenFile: paths.tokenFile },
  };
}

/** Interactive only: secrets never come in through flags (shell history, process list). */
async function authClient(ctx: Ctx): Promise<void> {
  const { io, t, out, paths, dotenv } = ctx;
  if (!io.interactive) throw new CliError(400, t.auth.client.interactiveOnly);
  assertDotenvReadable(ctx);

  const current = dotenv.status === "ok" ? dotenv.values : {};
  if (current[CLIENT_ID_KEY] !== undefined || current[CLIENT_SECRET_KEY] !== undefined) {
    out.warn(t.auth.client.existing(paths.envFile));
    if (!(await io.prompt.confirm({ message: t.common.overwrite, default: false }))) {
      ctx.result = { message: t.common.cancelled, data: { saved: false } };
      return;
    }
  }

  const required = (value: string) => value.trim() !== "" || t.auth.client.required;
  const id = (await io.prompt.input({ message: t.auth.client.id, validate: required })).trim();
  const secret = (
    await io.prompt.password({ message: t.auth.client.secret, validate: required })
  ).trim();

  updateDotenv(paths.envFile, { [CLIENT_ID_KEY]: id, [CLIENT_SECRET_KEY]: secret });
  ctx.result = {
    message: t.auth.client.saved(paths.envFile, id),
    data: { saved: true, envFile: paths.envFile, clientId: id },
  };
}
