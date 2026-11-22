import { CommanderError } from "@commander-js/extra-typings";
import type { Ctx } from "./context";
import { CliError, EXIT_INTERRUPTED, isPromptExit } from "./errors";
import type { Io } from "./io";
import { DEFAULT_LANG, isLang, packs } from "./locales";
import { Output } from "./output";
import { prescan } from "./prescan";
import { buildProgram, type OutputSink } from "./program";
import { envKey } from "./project";
import { loadConfig } from "./settings/config-file";
import { resolvePaths } from "./settings/paths";
import { resolveSettings } from "./settings/resolve";

/** The CLI as a function: parse `argv`, talk to the world only through `io`, return the exit code. */
export async function runCli(argv: string[], io: Io): Promise<number> {
  const pre = prescan(argv);
  const format = pre.format ?? (io.stdout.isTTY ? "text" : "json");
  // Settings are resolved before commander is built so that --help is already translated.
  const paths = resolvePaths(io);
  const config = loadConfig(paths.configFile);
  const settings = resolveSettings(
    [
      {
        source: "flag",
        values: { [envKey("LANG")]: pre.lang, [envKey("TIMEZONE")]: pre.timezone },
      },
      { source: "shell env", values: io.env },
      {
        source: "config.json",
        values: config.status === "ok" ? (config.config.ENVIRONMENTS ?? {}) : {},
      },
    ],
    { LANG: DEFAULT_LANG, TIMEZONE: io.systemTimeZone() },
  );
  const requested = settings.LANG?.value ?? DEFAULT_LANG;
  const lang = isLang(requested) ? requested : DEFAULT_LANG;
  const t = packs[lang];
  const out = new Output(io, format, t.label);
  if (lang !== requested) out.warn(t.warnings.unsupportedLang(requested, lang));
  const ctx: Ctx = { io, t, lang, out, settings, paths, config };
  const sink: OutputSink = { stdout: "", stderr: "" };

  try {
    const program = buildProgram(ctx, sink);
    await program.parseAsync(argv, { from: "user" });
    return out.success(ctx.result ?? { message: "OK" });
  } catch (err) {
    if (err instanceof CommanderError) return commanderResult(err, ctx, sink);
    if (isPromptExit(err)) return EXIT_INTERRUPTED;
    if (err instanceof CliError) return out.failure(err.status, err.message, err.hint);
    if (pre.verbose) io.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    return out.failure(500, t.errors.unexpected, pre.verbose ? undefined : t.errors.rerunVerbose);
  }
}

function commanderResult(err: CommanderError, { out, t }: Ctx, sink: OutputSink): number {
  if (err.exitCode === 0) {
    // --help, --version, `help <cmd>`
    if (out.format === "text") {
      out.raw("stdout", sink.stdout);
      return 0;
    }
    if (err.code === "commander.version") {
      return out.success({ message: "version", data: { version: sink.stdout.trim() } });
    }
    return out.success({ message: "help", data: { help: sink.stdout } });
  }
  // Usage errors: unify on 400 / exit 2. Commander's own messages are not translated.
  out.raw("stderr", sink.stderr);
  if (out.format === "text") return 2;
  const message =
    err.code === "commander.help"
      ? t.errors.subcommandRequired
      : err.message.replace(/^error: /, "");
  return out.failure(400, message);
}
