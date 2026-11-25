import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Ctx } from "../src/context";
import type { Io } from "../src/io";
import { en } from "../src/locales/en";
import { Output } from "../src/output";
import { getAccessToken, issueAndSave } from "../src/services/token-flow";
import {
  ApiError,
  type ClientCredentials,
  type TokenIssuer,
  type TokenResponse,
} from "../src/services/token-issuer";
import { ConfigFileStore } from "../src/settings/config-file";
import { DotenvStore } from "../src/settings/dotenv";
import type { Settings } from "../src/settings/resolve";
import type { StoreEnv } from "../src/settings/store";
import { type TokenState, TokenStateStore } from "../src/settings/token-state";
import { tempDir } from "./helpers";

const NOW = new Date("2026-11-22T14:10:00Z");
const EXPIRES = "2026-11-22T15:10:00.000Z";

interface Script {
  issuer: TokenIssuer;
  issueCalls: ClientCredentials[];
  refreshCalls: string[];
}

/** Each call consumes the next step. `"ok"` returns a fresh grant. */
function scripted(issue: Array<"ok" | 401> = [], refresh: Array<"ok" | 401> = []): Script {
  const issueCalls: ClientCredentials[] = [];
  const refreshCalls: string[] = [];
  let n = 0;
  const grant = (): TokenResponse => {
    n += 1;
    return { accessToken: `access-${n}`, refreshToken: `refresh-${n}`, expiresIn: 3600 };
  };
  const step = (queue: Array<"ok" | 401>, what: string): TokenResponse => {
    const next = queue.shift();
    if (next === undefined) throw new Error(`unexpected ${what}`);
    if (next === 401) throw new ApiError(401);
    return grant();
  };
  return {
    issueCalls,
    refreshCalls,
    issuer: {
      issueToken: async (creds) => {
        issueCalls.push(creds);
        return step(issue, "issueToken");
      },
      refreshAccessToken: async (refreshToken) => {
        refreshCalls.push(refreshToken);
        return step(refresh, "refreshAccessToken");
      },
    },
  };
}

function harness(opts: {
  now?: Date;
  clientId?: string;
  clientSecret?: string;
  state?: TokenState;
  issuer: TokenIssuer;
}) {
  const home = tempDir();
  const cwd = tempDir();
  const configDir = join(home, ".are-you-happy-cli");
  const tokenFile = join(configDir, "token-dir", "token.json");
  let stderr = "";
  const io: Io = {
    env: {},
    cwd,
    homedir: home,
    stdout: { write: () => {}, isTTY: false },
    stderr: {
      write: (chunk) => {
        stderr += chunk;
      },
      isTTY: false,
    },
    interactive: false,
    prompt: {
      input: async () => "",
      password: async () => "",
      select: async () => "" as never,
      confirm: async () => false,
    },
    now: () => opts.now ?? NOW,
    random: () => 0,
    systemTimeZone: () => "Asia/Seoul",
  };
  const out = new Output(io, "text", en.label);
  const env: StoreEnv = () => ({ t: en, warn: (message) => out.warn(message) });
  const id = opts.clientId ?? "happy-client";
  const secret = opts.clientSecret ?? "happy-secret";
  writeFileSync(
    join(cwd, ".env"),
    `ARE_YOU_HAPPY_CLI_CLIENT_ID=${id}\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=${secret}\n`,
    { mode: 0o600 },
  );
  const settings = {
    LANG: undefined,
    TIMEZONE: undefined,
    CLIENT_ID: { value: id, source: ".env" },
    CLIENT_SECRET: { value: secret, source: ".env" },
  } as Settings;
  const tokenState = new TokenStateStore(tokenFile, [configDir, join(configDir, "token-dir")], env);
  if (opts.state) tokenState.save(opts.state);
  const ctx: Ctx = {
    io,
    t: en,
    lang: "en",
    out,
    settings,
    config: new ConfigFileStore(join(configDir, "config.json"), configDir, env),
    dotenv: new DotenvStore(join(cwd, ".env"), env),
    tokenState,
    timezone: "Asia/Seoul",
    issuer: opts.issuer,
  };
  const saved = () => JSON.parse(readFileSync(tokenFile, "utf8")) as TokenState;
  return { ctx, stderr: () => stderr, saved };
}

const state = (patch: Partial<TokenState> = {}): TokenState => ({
  accessToken: "kept-access",
  refreshToken: "kept-refresh",
  expiresAt: EXPIRES,
  clientId: "happy-client",
  ...patch,
});

describe("TokenIssuer", () => {
  it("issueAndSave stores the grant from the scripted issuer", async () => {
    const script = scripted(["ok"]);
    const h = harness({ issuer: script.issuer });
    const saved = await issueAndSave(h.ctx);
    expect(script.issueCalls).toEqual([{ clientId: "happy-client", clientSecret: "happy-secret" }]);
    expect(saved).toMatchObject({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      clientId: "happy-client",
      expiresAt: EXPIRES,
    });
    expect(h.saved()).toMatchObject(saved);
  });

  it("reuses a Token State that has not expired", async () => {
    const script = scripted();
    const h = harness({
      issuer: script.issuer,
      now: new Date(new Date(EXPIRES).getTime() - 1000),
      state: state(),
    });
    await expect(getAccessToken(h.ctx)).resolves.toBe("kept-access");
    expect(script.issueCalls).toEqual([]);
    expect(script.refreshCalls).toEqual([]);
    expect(h.stderr()).toBe("");
    expect(h.saved().expiresAt).toBe(EXPIRES);
  });

  it("refreshes an expired Token State", async () => {
    const script = scripted([], ["ok"]);
    const h = harness({
      issuer: script.issuer,
      now: new Date(EXPIRES),
      state: state(),
    });
    await expect(getAccessToken(h.ctx)).resolves.toBe("access-1");
    expect(script.refreshCalls).toEqual(["kept-refresh"]);
    expect(script.issueCalls).toEqual([]);
    expect(h.stderr()).toContain(en.token.refreshed);
    expect(h.saved().expiresAt).toBe("2026-11-22T16:10:00.000Z");
  });

  it("re-issues when refresh fails", async () => {
    const script = scripted(["ok"], [401]);
    const h = harness({
      issuer: script.issuer,
      now: new Date(EXPIRES),
      state: state({ refreshToken: "stale" }),
    });
    await expect(getAccessToken(h.ctx)).resolves.toBe("access-1");
    expect(script.refreshCalls).toEqual(["stale"]);
    expect(script.issueCalls).toHaveLength(1);
    expect(h.stderr()).toContain(en.token.reissued);
    expect(h.saved()).toMatchObject({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresAt: "2026-11-22T16:10:00.000Z",
    });
  });

  it("refresh and re-issue both fail → credentials_rejected", async () => {
    const script = scripted([401], [401]);
    const h = harness({
      issuer: script.issuer,
      now: new Date(EXPIRES),
      state: state({ refreshToken: "stale" }),
    });
    await expect(getAccessToken(h.ctx)).rejects.toMatchObject({
      status: 401,
      reason: "credentials_rejected",
    });
    expect(script.refreshCalls).toEqual(["stale"]);
    expect(script.issueCalls).toHaveLength(1);
  });

  it("re-issues when the Client ID changed", async () => {
    const script = scripted(["ok"]);
    const h = harness({
      issuer: script.issuer,
      state: state({ clientId: "someone-else" }),
    });
    await expect(getAccessToken(h.ctx)).resolves.toBe("access-1");
    expect(script.refreshCalls).toEqual([]);
    expect(script.issueCalls).toEqual([{ clientId: "happy-client", clientSecret: "happy-secret" }]);
    expect(h.stderr()).toContain(en.token.clientChanged);
    expect(h.saved().clientId).toBe("happy-client");
  });
});
