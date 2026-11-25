import { type Ctx, cancel } from "../context";
import { CliError, type Reason } from "../errors";

export type Proceed = "proceed" | "cancelled";

export function requireInteractive(ctx: Ctx, fail: { message: string; reason: Reason }): void {
  if (!ctx.io.interactive) throw new CliError(400, fail.message, fail.reason);
}

export function requireWhenNonInteractive(
  ctx: Ctx,
  ok: boolean,
  fail: { message: string; reason: Reason },
): void {
  if (!ctx.io.interactive && !ok) throw new CliError(400, fail.message, fail.reason);
}

export async function confirmOrCancel(
  ctx: Ctx,
  opts: { message: string; default: boolean },
): Promise<Proceed> {
  const yes = await ctx.io.prompt.confirm(opts);
  if (!yes) {
    cancel(ctx);
    return "cancelled";
  }
  return "proceed";
}

export async function beforeOverwriteExistingFile(
  ctx: Ctx,
  opts: { exists: boolean; path: string; overwrittenWarning: string },
): Promise<Proceed> {
  if (!opts.exists) return "proceed";
  const { io, out } = ctx;
  if (io.interactive) {
    return confirmOrCancel(ctx, { message: ctx.t.common.overwrite, default: false });
  }
  out.warn(opts.overwrittenWarning);
  return "proceed";
}
