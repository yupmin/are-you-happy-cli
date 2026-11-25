import { parseEnv } from "node:util";
import { z } from "zod";
import { CliError, REASON } from "../errors";
import type { LanguagePack } from "../locales";
import { readIfExists, writePrivateFile } from "./private-file";
import { SnapshotStore } from "./store";

const DotenvSchema = z.record(z.string(), z.string());

type Dotenv = Record<string, string>;

const quote = (value: string) => (/^[\w.:/@+-]*$/.test(value) ? value : JSON.stringify(value));

/** The cwd .env, read once at startup. */
export class DotenvStore extends SnapshotStore<Dotenv> {
  /**
   * Sets `updates`, preserving every other line. Mode 600.
   * Every assignment of an updated key (including duplicates and `export`) takes the new value,
   * so a later duplicate cannot shadow it. `parseEnv` keeps the last value.
   */
  update(updates: Dotenv): void {
    const lines = (readIfExists(this.path) ?? "").split("\n");
    if (lines.at(-1) === "") lines.pop();
    const pending = new Map(Object.entries(updates));
    const seen = new Set<string>();
    const next = lines.map((line) => {
      const key = /^\s*(?:export\s+)?([\w.-]+)\s*=/.exec(line)?.[1];
      if (key === undefined || !pending.has(key)) return line;
      seen.add(key);
      return `${key}=${quote(pending.get(key) as string)}`;
    });
    for (const [key, value] of pending) {
      if (!seen.has(key)) next.push(`${key}=${quote(value)}`);
    }
    writePrivateFile(this.path, `${next.join("\n")}\n`);
  }

  protected parse(text: string): Dotenv | undefined {
    const parsed = DotenvSchema.safeParse(parseEnv(text));
    return parsed.success ? parsed.data : undefined;
  }

  protected brokenError(t: LanguagePack): CliError {
    return new CliError(
      400,
      t.errors.dotenvInvalid(this.path),
      REASON.dotenvInvalid,
      t.hints.runAuthClient,
    );
  }
}
