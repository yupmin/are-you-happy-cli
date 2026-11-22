import type { Io } from "./io";
import type { Lang, LanguagePack } from "./locales";
import type { Output, Success } from "./output";
import type { ConfigLoad } from "./settings/config-file";
import type { DotenvLoad } from "./settings/dotenv";
import type { Paths } from "./settings/paths";
import type { Settings } from "./settings/resolve";

/** Per-invocation state shared by every command. */
export interface Ctx {
  io: Io;
  t: LanguagePack;
  lang: Lang;
  out: Output;
  settings: Settings;
  paths: Paths;
  /** The Config File as found at startup. */
  config: ConfigLoad;
  /** The cwd .env as found at startup. */
  dotenv: DotenvLoad;
  /** Validated IANA time zone used for every displayed time. */
  timezone: string;
  /** Set by the command that ran; rendered once after parsing. */
  result?: Success;
}
