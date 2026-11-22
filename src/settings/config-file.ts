import { z } from "zod";
import { readIfExists, writePrivateFile } from "./private-file";

// ENVIRONMENTS holds Environment Settings; every other key is a File-only Setting.
export const ConfigSchema = z
  .object({ ENVIRONMENTS: z.record(z.string(), z.string()).optional() })
  .catchall(z.unknown());

export type Config = z.infer<typeof ConfigSchema>;

export type ConfigLoad =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "ok"; config: Config };

export function loadConfig(path: string): ConfigLoad {
  const text = readIfExists(path);
  if (text === undefined) return { status: "missing" };
  try {
    const parsed = ConfigSchema.safeParse(JSON.parse(text));
    return parsed.success ? { status: "ok", config: parsed.data } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

export function saveConfig(path: string, configDir: string, config: Config): void {
  writePrivateFile(path, `${JSON.stringify(config, null, 2)}\n`, [configDir]);
}
