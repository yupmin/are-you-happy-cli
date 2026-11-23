import type { Command } from "@commander-js/extra-typings";
import { type Ctx, cancel } from "../context";
import { CliError } from "../errors";
import { envKey } from "../project";
import { issueAndSave } from "../services/token-flow";

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

async function authIssueToken(ctx: Ctx): Promise<void> {
  const { t, timezone } = ctx;
  const state = await issueAndSave(ctx);
  const expiresAt = new Date(state.expiresAt);
  ctx.result = { message: t.auth.issueToken.issued(t.format.dateTime(expiresAt, timezone)) };
}

function authPurgeToken(ctx: Ctx): void {
  const { t, out, tokenState } = ctx;
  const deleted = tokenState.delete();
  if (!deleted) out.warn(t.auth.purgeToken.none);
  ctx.result = {
    message: deleted ? t.auth.purgeToken.purged(tokenState.path) : t.auth.purgeToken.none,
  };
}

/** Interactive only: secrets never come in through flags (shell history, process list). */
async function authClient(ctx: Ctx): Promise<void> {
  const { io, t, out, dotenv } = ctx;
  if (!io.interactive) throw new CliError(400, t.auth.client.interactiveOnly);

  const current = dotenv.read() ?? {};
  if (current[CLIENT_ID_KEY] !== undefined || current[CLIENT_SECRET_KEY] !== undefined) {
    out.warn(t.auth.client.existing(dotenv.path));
    if (!(await io.prompt.confirm({ message: t.common.overwrite, default: false }))) {
      cancel(ctx);
      return;
    }
  }

  const required = (value: string) => value.trim() !== "" || t.auth.client.required;
  const id = (await io.prompt.input({ message: t.auth.client.id, validate: required })).trim();
  const secret = (
    await io.prompt.password({ message: t.auth.client.secret, validate: required })
  ).trim();

  dotenv.update({ [CLIENT_ID_KEY]: id, [CLIENT_SECRET_KEY]: secret });
  ctx.result = { message: t.auth.client.saved(dotenv.path, id) };
}
