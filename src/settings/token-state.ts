import { rmSync } from "node:fs";
import { z } from "zod";
import { CliError, REASON } from "../errors";
import type { LanguagePack } from "../locales";
import { readIfExists, writePrivateFile } from "./private-file";
import { PrivateFileStore, type StoreEnv } from "./store";

const tokenStateSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.iso.datetime({ offset: true }),
  clientId: z.string().min(1),
});

export type TokenState = z.infer<typeof tokenStateSchema>;

/** The Token State, read fresh on every call (no lenient read: nothing resolves settings from it). Its folders are created as 700 on save. */
export class TokenStateStore extends PrivateFileStore<TokenState> {
  constructor(
    path: string,
    private readonly privateDirs: string[],
    env: StoreEnv,
  ) {
    super(path, env);
  }

  /** Undefined when missing, 400 when broken, warns when too open. */
  read(): TokenState | undefined {
    return this.strict(this.load());
  }

  save(state: TokenState): void {
    writePrivateFile(this.path, `${JSON.stringify(state, null, 2)}\n`, this.privateDirs);
  }

  /** Returns whether there was anything to delete. */
  delete(): boolean {
    if (readIfExists(this.path) === undefined) return false;
    rmSync(this.path);
    return true;
  }

  protected parse(text: string): TokenState | undefined {
    const parsed = tokenStateSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : undefined;
  }

  protected brokenError(t: LanguagePack): CliError {
    return new CliError(400, t.token.invalid, REASON.tokenInvalid, t.hints.runIssueToken);
  }
}
