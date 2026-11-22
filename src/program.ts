import { Command, Option } from "@commander-js/extra-typings";
import pkg from "../package.json" with { type: "json" };
import type { Ctx } from "./context";
import { FORMATS } from "./output";
import { BIN_NAME } from "./project";

export interface OutputSink {
  stdout: string;
  stderr: string;
}

export function buildProgram(ctx: Ctx, sink: OutputSink) {
  const { t } = ctx;
  const program = new Command(BIN_NAME)
    .description(t.program.description)
    .version(pkg.version, "--version", t.program.version)
    .helpOption("-h, --help", t.program.help)
    .helpCommand("help [command]", t.program.helpCommand)
    .addOption(new Option("--format <format>", t.program.format).choices(FORMATS))
    .option("--verbose", t.program.verbose)
    .exitOverride()
    .configureOutput({
      writeOut: (s) => {
        sink.stdout += s;
      },
      writeErr: (s) => {
        sink.stderr += s;
      },
    })
    .showHelpAfterError(ctx.out.format === "text")
    .addHelpText("after", t.program.examples);

  program.command("config").description(t.groups.config).addHelpText("after", t.examples.config);
  program.command("auth").description(t.groups.auth).addHelpText("after", t.examples.auth);
  program.command("action").description(t.groups.action).addHelpText("after", t.examples.action);

  return program;
}
