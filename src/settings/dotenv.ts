import { parseEnv } from "node:util";
import { z } from "zod";
import { readIfExists, writePrivateFile } from "./private-file";

const DotenvSchema = z.record(z.string(), z.string());

export type DotenvLoad =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "ok"; values: Record<string, string> };

export function loadDotenv(path: string): DotenvLoad {
  const text = readIfExists(path);
  if (text === undefined) return { status: "missing" };
  try {
    const parsed = DotenvSchema.safeParse(parseEnv(text));
    return parsed.success ? { status: "ok", values: parsed.data } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

const quote = (value: string) => (/^[\w.:/@+-]*$/.test(value) ? value : JSON.stringify(value));

/** Sets `updates` in the .env at `path`, preserving every other line. Mode 600. */
export function updateDotenv(path: string, updates: Record<string, string>): void {
  const lines = (readIfExists(path) ?? "").split("\n");
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
  writePrivateFile(path, `${next.join("\n")}\n`);
}
