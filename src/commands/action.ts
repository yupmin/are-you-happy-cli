import type { Command } from "@commander-js/extra-typings";
import type { Ctx } from "../context";
import { CliError } from "../errors";
import { assertConfigReadable, warnIfTooOpen } from "../guards";
import * as api from "../services/api";
import { ApiError } from "../services/api";
import { getAccessToken } from "../services/token-flow";
import { formatIsoInTimeZone } from "../time";

export function registerAction(group: Command, ctx: Ctx): void {
  // Shared guard for every action command, including ones added later.
  group.hook("preAction", () => {
    const { config, t, paths } = ctx;
    if (config.status === "missing") {
      throw new CliError(400, t.action.configRequired, t.hints.runConfigInitFirst);
    }
    assertConfigReadable(ctx);
    warnIfTooOpen(ctx, paths.configFile);
  });

  // SAMPLE: delete this command when turning the template into another CLI.
  group
    .command("are-you")
    .description(ctx.t.action.areYou.description)
    .argument("<name>", ctx.t.action.areYou.name)
    .action((name) => areYou(ctx, name));
}

/** Calls the API with the stored Access Token; a 401 from the API becomes a CliError. */
export async function callApi<T>(ctx: Ctx, call: (accessToken: string) => Promise<T>): Promise<T> {
  const accessToken = await getAccessToken(ctx);
  try {
    return await call(accessToken);
  } catch (err) {
    if (err instanceof ApiError) {
      throw new CliError(err.status, ctx.t.token.rejected, ctx.t.hints.runIssueToken);
    }
    throw err;
  }
}

// SAMPLE: action are-you <name>
async function areYou(ctx: Ctx, name: string): Promise<void> {
  const { io, t, timezone } = ctx;
  const { mood } = await callApi(ctx, (token) => api.getMood(token, name, io.random));
  const now = io.now();
  const message = t.action.areYou.message(name, mood);
  ctx.result = {
    message,
    text: t.action.areYou.text(message, t.format.dateTime(now, timezone)),
    data: { name, mood, message, checkedAt: formatIsoInTimeZone(now, timezone) },
  };
}
