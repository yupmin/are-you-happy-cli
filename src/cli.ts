import { homedir } from "node:os";
import { confirm, input, password, select } from "@inquirer/prompts";
import type { Io } from "./io";
import { runCli } from "./run-cli";

const io: Io = {
  env: process.env,
  cwd: process.cwd(),
  homedir: homedir(),
  stdout: { write: (s) => void process.stdout.write(s), isTTY: Boolean(process.stdout.isTTY) },
  stderr: { write: (s) => void process.stderr.write(s), isTTY: Boolean(process.stderr.isTTY) },
  // Prompts render on stderr so stdout stays a single JSON envelope in json mode (ADR-0001).
  interactive: Boolean(process.stdin.isTTY && process.stderr.isTTY),
  prompt: {
    input: (opts) => input(opts, { output: process.stderr }),
    password: (opts) => password(opts, { output: process.stderr }),
    select: (opts) => select(opts, { output: process.stderr }),
    confirm: (opts) => confirm(opts, { output: process.stderr }),
  },
  now: () => new Date(),
  random: Math.random,
  systemTimeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// Never process.exit(): let pending output flush.
process.exitCode = await runCli(process.argv.slice(2), io);
