import { CommanderError } from "@commander-js/extra-typings";
import type { Ctx } from "./context";
import { CliError, EXIT_INTERRUPTED, isPromptExit } from "./errors";
import type { Io } from "./io";
import { DEFAULT_LANG, packs } from "./locales";
import { Output } from "./output";
import { prescan } from "./prescan";
import { buildProgram, type OutputSink } from "./program";

/** The CLI as a function: parse `argv`, talk to the world only through `io`, return the exit code. */
export async function runCli(argv: string[], io: Io): Promise<number> {
  const pre = prescan(argv);
  const format = pre.format ?? (io.stdout.isTTY ? "text" : "json");
  const lang = DEFAULT_LANG;
  const t = packs[lang];
  const out = new Output(io, format, t.label);
  const ctx: Ctx = { io, t, lang, out };
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
