import type { Io } from "./io";
import type { Lang, LanguagePack } from "./locales";
import type { Output, Success } from "./output";
import type { ConfigFileStore } from "./settings/config-file";
import type { DotenvStore } from "./settings/dotenv";
import type { Settings } from "./settings/resolve";
import type { TokenStateStore } from "./settings/token-state";

/** Per-invocation state shared by every command. */
export interface Ctx {
  io: Io;
  t: LanguagePack;
  lang: Lang;
  out: Output;
  settings: Settings;
  /** The Config File as found at startup. */
  config: ConfigFileStore;
  /** The cwd .env as found at startup. */
  dotenv: DotenvStore;
  tokenState: TokenStateStore;
  /** Validated IANA time zone used for every displayed time. */
  timezone: string;
  /** Set by the command that ran; rendered once after parsing. */
  result?: Success;
}

/** The user declined a confirmation: nothing was saved. */
export function cancel(ctx: Ctx): void {
  ctx.result = { message: ctx.t.common.cancelled };
}
