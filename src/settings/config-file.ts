import { z } from "zod";
import { CliError } from "../errors";
import type { LanguagePack } from "../locales";
import { writePrivateFile } from "./private-file";
import { SnapshotStore, type StoreEnv } from "./store";

// ENVIRONMENTS holds Environment Settings; every other key is a File-only Setting.
export const ConfigSchema = z
  .object({ ENVIRONMENTS: z.record(z.string(), z.string()).optional() })
  .catchall(z.unknown());

export type Config = z.infer<typeof ConfigSchema>;

/** The Config File, read once at startup. Its folder is created as 700 on save. */
export class ConfigFileStore extends SnapshotStore<Config> {
  constructor(
    path: string,
    private readonly dir: string,
    env: StoreEnv,
  ) {
    super(path, env);
  }

  save(config: Config): void {
    writePrivateFile(this.path, `${JSON.stringify(config, null, 2)}\n`, [this.dir]);
  }

  protected parse(text: string): Config | undefined {
    const parsed = ConfigSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : undefined;
  }

  protected brokenError(t: LanguagePack): CliError {
    return new CliError(400, t.errors.configInvalid(this.path), t.hints.runConfigInit);
  }
}
