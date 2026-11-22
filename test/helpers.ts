import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Io, Prompter } from "../src/io";
import { runCli } from "../src/run-cli";

export type Answer = string | boolean | { cancel: true };

/** Scripted prompter: each prompt call consumes the next answer. `{ cancel: true }` simulates Ctrl+C. */
export function scriptedPrompter(answers: Answer[]): Prompter & { asked: string[] } {
  const asked: string[] = [];
  const next = (message: string): Answer => {
    asked.push(message);
    if (answers.length === 0) throw new Error(`Unexpected prompt: ${message}`);
    const answer = answers.shift() as Answer;
    if (typeof answer === "object") {
      const err = new Error("User force closed the prompt");
      err.name = "ExitPromptError";
      throw err;
    }
    return answer;
  };
  return {
    asked,
    input: async ({ message, validate }) => {
      const value = String(next(message));
      const verdict = validate?.(value);
      if (verdict !== undefined && verdict !== true) throw new Error(`validation: ${verdict}`);
      return value;
    },
    password: async ({ message, validate }) => {
      const value = String(next(message));
      const verdict = validate?.(value);
      if (verdict !== undefined && verdict !== true) throw new Error(`validation: ${verdict}`);
      return value;
    },
    select: async ({ message }) => next(message) as never,
    confirm: async ({ message }) => Boolean(next(message)),
  };
}

export function tempDir(prefix = "ayh-"): string {
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}

export interface RunOptions {
  env?: Record<string, string | undefined>;
  cwd?: string;
  home?: string;
  tty?: boolean;
  answers?: Answer[];
  now?: Date;
  random?: () => number;
  systemTimeZone?: string;
}

export async function run(argv: string[], opts: RunOptions = {}) {
  let stdout = "";
  let stderr = "";
  const tty = opts.tty ?? false;
  const prompter = scriptedPrompter([...(opts.answers ?? [])]);
  const io: Io = {
    env: opts.env ?? {},
    cwd: opts.cwd ?? tempDir(),
    homedir: opts.home ?? tempDir(),
    stdout: {
      write: (s) => {
        stdout += s;
      },
      isTTY: tty,
    },
    stderr: {
      write: (s) => {
        stderr += s;
      },
      isTTY: tty,
    },
    interactive: tty,
    prompt: prompter,
    now: () => opts.now ?? new Date("2026-11-22T14:10:00Z"),
    random: opts.random ?? (() => 0),
    systemTimeZone: () => opts.systemTimeZone ?? "Asia/Seoul",
  };
  const exitCode = await runCli(argv, io);
  return {
    exitCode,
    stdout,
    stderr,
    asked: prompter.asked,
    json: () => JSON.parse(stdout) as { code: number; message: string; data: any },
  };
}
