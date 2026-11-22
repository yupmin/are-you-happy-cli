import type { Command } from "@commander-js/extra-typings";
import type { Ctx } from "../context";
import { CliError } from "../errors";
import { assertDotenvReadable } from "../guards";
import { envKey } from "../project";
import { updateDotenv } from "../settings/dotenv";

export const CLIENT_ID_KEY = envKey("CLIENT_ID");
export const CLIENT_SECRET_KEY = envKey("CLIENT_SECRET");

export function registerAuth(group: Command, ctx: Ctx): void {
  group
    .command("client")
    .description(ctx.t.auth.client.description)
    .action(() => authClient(ctx));
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
