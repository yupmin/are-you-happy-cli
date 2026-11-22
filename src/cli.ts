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
  interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  prompt: {
    input: (opts) => input(opts),
    password: (opts) => password(opts),
    select: (opts) => select(opts),
    confirm: (opts) => confirm(opts),
  },
  now: () => new Date(),
  random: Math.random,
  systemTimeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// Never process.exit(): let pending output flush.
process.exitCode = await runCli(process.argv.slice(2), io);
