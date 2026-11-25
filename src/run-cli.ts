import { CommanderError } from "@commander-js/extra-typings";
import type { Ctx } from "./context";
import { CliError, EXIT_INTERRUPTED, isPromptExit, REASON } from "./errors";
import type { Io } from "./io";
import { DEFAULT_LANG, isLang, LANGUAGES, packs } from "./locales";
import { FORMAT_GROUP, Output } from "./output";
import { prescan } from "./prescan";
import { buildProgram, type OutputSink } from "./program";
import { envKey } from "./project";
import { ConfigFileStore } from "./settings/config-file";
import { DotenvStore } from "./settings/dotenv";
import { resolvePaths } from "./settings/paths";
import { resolveSettings } from "./settings/resolve";
import type { StoreEnv } from "./settings/store";
import { TokenStateStore } from "./settings/token-state";
import { isValidTimeZone } from "./timezone";

/** The CLI as a function: parse `argv`, talk to the world only through `io`, return the exit code. */
export async function runCli(argv: string[], io: Io): Promise<number> {
  const pre = prescan(argv);
  const format =
    pre.command === FORMAT_GROUP ? (pre.format ?? (io.stdout.isTTY ? "text" : "json")) : "text";
  // Settings are resolved before commander is built so that --help is already translated.
  const paths = resolvePaths(io);
  let storeEnv: ReturnType<StoreEnv> | undefined;
  const env: StoreEnv = () => {
    if (!storeEnv) throw new Error("a store was read strictly before the Language Pack was chosen");
    return storeEnv;
  };
  const config = new ConfigFileStore(paths.configFile, paths.configDir, env);
  const dotenv = new DotenvStore(paths.envFile, env);
  const tokenState = new TokenStateStore(paths.tokenFile, [paths.configDir, paths.tokenDir], env);
  const settings = resolveSettings(
    [
      {
        source: "flag",
        values: { [envKey("LANG")]: pre.lang, [envKey("TIMEZONE")]: pre.timezone },
      },
      { source: "shell env", values: io.env },
      { source: ".env", values: dotenv.peek() ?? {} },
      { source: "config.json", values: config.peek()?.ENVIRONMENTS ?? {} },
    ],
    { LANG: DEFAULT_LANG, TIMEZONE: io.systemTimeZone() },
  );
  const requested = settings.LANG?.value ?? DEFAULT_LANG;
  const lang = isLang(requested) ? requested : DEFAULT_LANG;
  const t = packs[lang];
  const out = new Output(io, format, t.label);
  storeEnv = { t, warn: (message) => out.warn(message) };
  // An invalid flag is a usage error; an invalid env/config value falls back with a warning.
  if (pre.lang !== undefined && !isLang(pre.lang)) {
    return out.failure(
      400,
      t.errors.unsupportedLang(pre.lang, LANGUAGES.join(", ")),
      REASON.unsupportedLang,
    );
  }
  if (pre.timezone !== undefined && !isValidTimeZone(pre.timezone)) {
    return out.failure(400, t.errors.invalidTimezone(pre.timezone), REASON.invalidTimezone);
  }
  if (lang !== requested) out.warn(t.warnings.unsupportedLang(requested, lang));
  const timezone = resolveTimeZone(settings.TIMEZONE?.value, io, (value, fallback) =>
    out.warn(t.warnings.invalidTimezone(value, fallback)),
  );
  const ctx: Ctx = { io, t, lang, out, settings, config, dotenv, tokenState, timezone };
  const sink: OutputSink = { stdout: "", stderr: "" };

  try {
    const program = buildProgram(ctx, sink);
    await program.parseAsync(argv, { from: "user" });
    return out.success(ctx.result ?? { message: t.common.ok });
  } catch (err) {
    if (err instanceof CommanderError) return commanderResult(err, ctx, sink);
    if (isPromptExit(err)) return EXIT_INTERRUPTED;
    if (err instanceof CliError) return out.failure(err.status, err.message, err.reason, err.hint);
    if (pre.verbose) io.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    return out.failure(
      500,
      t.errors.unexpected,
      REASON.unexpected,
      pre.verbose ? undefined : t.errors.rerunVerbose,
    );
  }
}

function resolveTimeZone(
  requested: string | undefined,
  io: Io,
  onInvalid: (value: string, fallback: string) => void,
): string {
  const fallback = io.systemTimeZone();
  if (requested === undefined || isValidTimeZone(requested)) return requested ?? fallback;
  onInvalid(requested, fallback);
  return fallback;
}

function commanderResult(err: CommanderError, { out, t }: Ctx, sink: OutputSink): number {
  if (err.exitCode === 0) {
    // --help, --version, `help <cmd>`
    if (out.format === "text") {
      out.raw("stdout", sink.stdout);
      return 0;
    }
    if (err.code === "commander.version") {
      return out.success({ message: t.common.version, data: { version: sink.stdout.trim() } });
    }
    return out.success({ message: t.common.help, data: { help: sink.stdout } });
  }
  // Usage errors: unify on 400 / exit 2. Commander's own messages are not translated.
  out.raw("stderr", sink.stderr);
  if (out.format === "text") return 2;
  const message =
    err.code === "commander.help"
      ? t.errors.subcommandRequired
      : err.message.replace(/^error: /, "");
  return out.failure(400, message, REASON.usage);
}
