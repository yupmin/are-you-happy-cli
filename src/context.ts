import type { Io } from "./io";
import type { Lang, LanguagePack } from "./locales";
import type { Output, Success } from "./output";

/** Per-invocation state shared by every command. */
export interface Ctx {
  io: Io;
  t: LanguagePack;
  lang: Lang;
  out: Output;
  /** Set by the command that ran; rendered once after parsing. */
  result?: Success;
}
