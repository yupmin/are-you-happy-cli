import type { Command } from "@commander-js/extra-typings";
import type { Ctx } from "../context";
import { CliError, REASON } from "../errors";
import * as api from "../services/api";
import { callWithAccessToken } from "../services/token-flow";
import { formatIsoInTimeZone } from "../time";

export function registerAction(group: Command, ctx: Ctx): void {
  // Shared guard for every action command, including ones added later.
  group.hook("preAction", () => {
    const { config, t } = ctx;
    if (config.read() === undefined) {
      throw new CliError(
        400,
        t.action.configRequired,
        REASON.configMissing,
        t.hints.runConfigInitFirst,
      );
    }
  });

  // SAMPLE: delete this command when turning the template into another CLI.
  group
    .command("are-you")
    .description(ctx.t.action.areYou.description)
    .argument("<name>", ctx.t.action.areYou.name)
    .action((name) => areYou(ctx, name));
}

// SAMPLE: action are-you <name>
async function areYou(ctx: Ctx, name: string): Promise<void> {
  const { io, t, timezone } = ctx;
  const { mood } = await callWithAccessToken(ctx, (token) => api.getMood(token, name, io.random));
  const now = io.now();
  const message = t.action.areYou.message(name, mood);
  ctx.result = {
    message,
    text: t.action.areYou.text(message, t.format.dateTime(now, timezone)),
    data: { name, mood, message, checkedAt: formatIsoInTimeZone(now, timezone) },
  };
}
