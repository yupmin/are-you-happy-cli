import type { CliError } from "../errors";
import type { LanguagePack } from "../locales";
import { isTooOpen, readIfExists } from "./private-file";

/**
 * What a store needs from the invocation: the Language Pack for its messages and the warning
 * channel. A thunk because the Language Pack is chosen from the stores' own (lenient) values.
 */
export type StoreEnv = () => { t: LanguagePack; warn: (message: string) => void };

type Load<T> = { status: "missing" } | { status: "invalid" } | { status: "ok"; value: T };

/**
 * One private settings file (600). Subclasses say how to parse it and what "broken" means;
 * this base owns the missing / broken / ok distinction and the too-open warning.
 */
export abstract class PrivateFileStore<T> {
  private warned = false;

  constructor(
    readonly path: string,
    private readonly env: StoreEnv,
  ) {}

  /** The parsed value, or undefined when the text fails the schema. May throw on bad syntax. */
  protected abstract parse(text: string): T | undefined;

  /** The 400 for a file that exists but is broken. */
  protected abstract brokenError(t: LanguagePack): CliError;

  protected load(): Load<T> {
    const text = readIfExists(this.path);
    if (text === undefined) return { status: "missing" };
    try {
      const value = this.parse(text);
      return value === undefined ? { status: "invalid" } : { status: "ok", value };
    } catch {
      return { status: "invalid" };
    }
  }

  /** Broken → 400; wider than 600 → one warning per invocation; missing → undefined. */
  protected strict(load: Load<T>): T | undefined {
    if (load.status === "invalid") throw this.brokenError(this.env().t);
    if (!this.warned && isTooOpen(this.path)) {
      this.warned = true;
      const { t, warn } = this.env();
      warn(t.warnings.tooOpen(this.path));
    }
    return load.status === "ok" ? load.value : undefined;
  }
}

/** A store read once at startup: lenient `peek` for settings resolution, strict `read`/`check`. */
export abstract class SnapshotStore<T> extends PrivateFileStore<T> {
  private readonly snapshot: Load<T>;

  constructor(path: string, env: StoreEnv) {
    super(path, env);
    this.snapshot = this.load();
  }

  /** True when the file is there, even if broken. */
  get exists(): boolean {
    return this.snapshot.status !== "missing";
  }

  /** Lenient: the value if valid, otherwise undefined. */
  peek(): T | undefined {
    return this.snapshot.status === "ok" ? this.snapshot.value : undefined;
  }

  /** Strict: undefined when missing, 400 when broken, warns when too open. */
  read(): T | undefined {
    return this.strict(this.snapshot);
  }

  /** `read` for its checks only: 400 when broken, warns when too open. */
  check(): void {
    this.read();
  }
}
