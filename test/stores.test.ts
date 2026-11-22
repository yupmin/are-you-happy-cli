import { chmodSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CliError } from "../src/errors";
import { packs } from "../src/locales";
import { ConfigFileStore } from "../src/settings/config-file";
import { DotenvStore } from "../src/settings/dotenv";
import type { StoreEnv } from "../src/settings/store";
import { TokenStateStore } from "../src/settings/token-state";
import { tempDir } from "./helpers";

const mode = (p: string) => statSync(p).mode & 0o777;

function env() {
  const warnings: string[] = [];
  const storeEnv: StoreEnv = () => ({ t: packs.en, warn: (m) => warnings.push(m) });
  return { warnings, storeEnv };
}

const STATE = {
  accessToken: "a",
  refreshToken: "r",
  expiresAt: "2026-11-22T15:10:00.000Z",
  clientId: "c",
};

describe("ConfigFileStore", () => {
  it("missing: not there, peek/read give undefined", () => {
    const dir = join(tempDir(), "cfg");
    const store = new ConfigFileStore(join(dir, "config.json"), dir, env().storeEnv);
    expect(store.exists).toBe(false);
    expect(store.peek()).toBeUndefined();
    expect(store.read()).toBeUndefined();
  });

  it("broken: exists, peek is lenient, read is a 400 pointing at config init", () => {
    const dir = tempDir();
    const path = join(dir, "config.json");
    writeFileSync(path, "{", { mode: 0o600 });
    const store = new ConfigFileStore(path, dir, env().storeEnv);
    expect(store.exists).toBe(true);
    expect(store.peek()).toBeUndefined();
    let error: unknown;
    try {
      store.read();
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(CliError);
    expect(error).toMatchObject({ status: 400, hint: expect.stringContaining("config init") });
  });

  it("too open: read warns once however often it is called", () => {
    const dir = tempDir();
    const path = join(dir, "config.json");
    writeFileSync(path, "{}");
    chmodSync(path, 0o644);
    const { warnings, storeEnv } = env();
    const store = new ConfigFileStore(path, dir, storeEnv);
    expect(store.read()).toEqual({});
    store.read();
    expect(warnings).toHaveLength(1);
  });

  it("save: file 600, folder 700", () => {
    const dir = join(tempDir(), "cfg");
    const path = join(dir, "config.json");
    new ConfigFileStore(path, dir, env().storeEnv).save({ mode: "CRAZY" });
    expect(mode(path)).toBe(0o600);
    expect(mode(dir)).toBe(0o700);
  });
});

describe("DotenvStore", () => {
  it("update keeps other lines and writes 600", () => {
    const path = join(tempDir(), ".env");
    writeFileSync(path, "OTHER=1\n");
    chmodSync(path, 0o644);
    new DotenvStore(path, env().storeEnv).update({ KEY: "v" });
    expect(new DotenvStore(path, env().storeEnv).peek()).toEqual({ OTHER: "1", KEY: "v" });
    expect(mode(path)).toBe(0o600);
  });
});

describe("TokenStateStore", () => {
  const paths = () => {
    const configDir = join(tempDir(), "cfg");
    const tokenDir = join(configDir, "token-dir");
    return { configDir, tokenDir, file: join(tokenDir, "token.json") };
  };

  it("reads fresh every time: save then read round-trips", () => {
    const p = paths();
    const store = new TokenStateStore(p.file, [p.configDir, p.tokenDir], env().storeEnv);
    expect(store.read()).toBeUndefined();
    store.save(STATE);
    expect(store.read()).toEqual(STATE);
    expect(mode(p.file)).toBe(0o600);
    expect(mode(p.tokenDir)).toBe(0o700);
    expect(mode(p.configDir)).toBe(0o700);
  });

  it("broken: read is a 400 pointing at issue-token", () => {
    const p = paths();
    mkdirSync(p.tokenDir, { recursive: true });
    writeFileSync(p.file, JSON.stringify({ ...STATE, accessToken: "" }));
    const store = new TokenStateStore(p.file, [p.configDir, p.tokenDir], env().storeEnv);
    expect(() => store.read()).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("delete reports whether there was anything to delete", () => {
    const p = paths();
    const store = new TokenStateStore(p.file, [p.configDir, p.tokenDir], env().storeEnv);
    expect(store.delete()).toBe(false);
    store.save(STATE);
    expect(store.delete()).toBe(true);
    expect(existsSync(p.file)).toBe(false);
  });
});
