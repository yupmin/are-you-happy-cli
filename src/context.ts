import type { Io } from "./io";
import type { Lang, LanguagePack } from "./locales";
import type { Output, Success } from "./output";
import type { ConfigLoad } from "./settings/config-file";
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
  /** Set by the command that ran; rendered once after parsing. */
  result?: Success;
}
