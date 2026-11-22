import { parseEnv } from "node:util";
import { z } from "zod";
import { CliError } from "../errors";
import type { LanguagePack } from "../locales";
import { readIfExists, writePrivateFile } from "./private-file";
import { SnapshotStore } from "./store";

const DotenvSchema = z.record(z.string(), z.string());

type Dotenv = Record<string, string>;

const quote = (value: string) => (/^[\w.:/@+-]*$/.test(value) ? value : JSON.stringify(value));

/** The cwd .env, read once at startup. */
export class DotenvStore extends SnapshotStore<Dotenv> {
  /** Sets `updates`, preserving every other line. Mode 600. */
  update(updates: Dotenv): void {
    const lines = (readIfExists(this.path) ?? "").split("\n");
    if (lines.at(-1) === "") lines.pop();
    const pending = new Map(Object.entries(updates));
    const next = lines.map((line) => {
      const key = /^\s*(?:export\s+)?([\w.-]+)\s*=/.exec(line)?.[1];
      if (key === undefined || !pending.has(key)) return line;
      const value = pending.get(key) as string;
      pending.delete(key);
      return `${key}=${quote(value)}`;
    });
    for (const [key, value] of pending) next.push(`${key}=${quote(value)}`);
    writePrivateFile(this.path, `${next.join("\n")}\n`);
  }

  protected parse(text: string): Dotenv | undefined {
    const parsed = DotenvSchema.safeParse(parseEnv(text));
    return parsed.success ? parsed.data : undefined;
  }

  protected brokenError(t: LanguagePack): CliError {
    return new CliError(400, t.errors.dotenvInvalid(this.path), t.hints.runAuthClient);
  }
}
