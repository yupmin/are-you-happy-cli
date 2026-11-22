import { z } from "zod";
import { CliError } from "../errors";
import type { LanguagePack } from "../locales";
import { writePrivateFile } from "./private-file";
import { PrivateFileStore, type StoreEnv } from "./store";

// ENVIRONMENTS holds Environment Settings; every other key is a File-only Setting.
export const ConfigSchema = z
  .object({ ENVIRONMENTS: z.record(z.string(), z.string()).optional() })
  .catchall(z.unknown());

export type Config = z.infer<typeof ConfigSchema>;

/** The Config File, read once at startup. Its folder is created as 700 on save. */
export class ConfigFileStore extends PrivateFileStore<Config> {
  private readonly snapshot;

  constructor(
    path: string,
    private readonly dir: string,
    env: StoreEnv,
  ) {
    super(path, env);
    this.snapshot = this.load();
  }

  /** True when the file is there, even if broken. */
  get exists(): boolean {
    return this.snapshot.status !== "missing";
  }

  /** Lenient: the Config File if valid, otherwise undefined. For settings resolution and init. */
  peek(): Config | undefined {
    return this.snapshot.status === "ok" ? this.snapshot.value : undefined;
  }

  /** Strict: undefined when missing, 400 when broken, warns when too open. */
  read(): Config | undefined {
    return this.strict(this.snapshot);
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
