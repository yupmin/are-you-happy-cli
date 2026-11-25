import { chmodSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type RunOptions, run, tempDir } from "./helpers";

const NOW = new Date("2026-11-22T14:10:00Z");

/** A user who ran config init, auth client and auth issue-token. */
async function readyUser(opts: { lang?: string; tz?: string; token?: boolean } = {}) {
  const home = tempDir();
  const cwd = tempDir();
  const base: RunOptions = { home, cwd, now: NOW };
  await run(
    ["config", "init", "--lang", opts.lang ?? "en", "--timezone", opts.tz ?? "Asia/Seoul"],
    base,
  );
  writeFileSync(
    join(cwd, ".env"),
    "ARE_YOU_HAPPY_CLI_CLIENT_ID=happy-client\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=happy-secret\n",
    { mode: 0o600 },
  );
  if (opts.token !== false) await run(["auth", "issue-token"], base);
  const tokenFile = join(home, ".are-you-happy-cli", "token-dir", "token.json");
  const token = () => JSON.parse(readFileSync(tokenFile, "utf8"));
  const setToken = (patch: Record<string, string>) =>
    writeFileSync(tokenFile, JSON.stringify({ ...token(), ...patch }));
  const areYou = (name: string, more: RunOptions & { argv?: string[] } = {}) =>
    run(["action", "are-you", name, ...(more.argv ?? [])], { ...base, ...more });
  return { home, cwd, tokenFile, token, setToken, areYou };
}

describe("action are-you", () => {
  it("en: 'Minsu is happy.' with checkedAt in the configured time zone", async () => {
    const u = await readyUser();
    const r = await u.areYou("Minsu", { random: () => 0 });
    expect(r.exitCode).toBe(0);
    expect(r.json().reason).toBeUndefined();
    expect(r.json().data).toEqual({
      name: "Minsu",
      mood: "happy",
      message: "Minsu is happy.",
      checkedAt: "2026-11-22T23:10:00+09:00",
      warnings: [],
    });
  });

  it.each([
    [0, "happy", "민수는 행복해"],
    [0.2, "sad", "민수는 슬퍼"],
    [0.4, "angry", "민수는 화나"],
    [0.6, "excited", "민수는 신나"],
    [0.99, "tired", "민수는 피곤해"],
  ])("ko: random %f → %s → %s", async (n, mood, message) => {
    const u = await readyUser({ lang: "ko" });
    const r = await u.areYou("민수", { random: () => n });
    expect(r.json().data).toMatchObject({ mood, message });
  });

  it("ko: picks 은 after a final consonant", async () => {
    const u = await readyUser({ lang: "ko" });
    const r = await u.areYou("영진", { random: () => 0.99 });
    expect(r.json().data.message).toBe("영진은 피곤해");
  });

  it("text: shows date and time in the Language Pack format and time zone", async () => {
    const u = await readyUser({ tz: "UTC" });
    const r = await u.areYou("Minsu", { argv: ["--format", "text"] });
    expect(r.stdout).toContain("Minsu is happy.");
    expect(r.stdout).toContain("Nov 22, 2026, 2:10 PM (UTC)");
  });

  it("--format json after the action name beats TTY detection", async () => {
    const u = await readyUser();
    const r = await u.areYou("Minsu", { tty: true, argv: ["--format", "json"] });
    expect(r.json().data.mood).toBe("happy");
  });

  it("no Config File → 400 / exit 2 telling to run config init", async () => {
    const r = await run(["action", "are-you", "Minsu"]);
    expect(r.exitCode).toBe(2);
    expect(r.json()).toMatchObject({ code: 400, reason: "config_missing", data: { warnings: [] } });
    expect(r.json().message).toContain("config init");
  });

  it("no Token State → issues one automatically, then reuses it within the TTL", async () => {
    const u = await readyUser({ token: false });
    const first = await u.areYou("Minsu");
    expect(first.exitCode).toBe(0);
    expect(first.json().data.warnings).toEqual([expect.stringMatching(/issued/i)]);
    expect(statSync(join(u.tokenFile, "..")).mode & 0o777).toBe(0o700);
    expect(statSync(u.tokenFile).mode & 0o777).toBe(0o600);
    const issued = u.token();
    expect(issued).toMatchObject({ clientId: "happy-client", accessToken: "it.me.and.you" });

    const second = await u.areYou("Minsu", { now: new Date(NOW.getTime() + 30 * 60_000) });
    expect(second.exitCode).toBe(0);
    expect(second.json().data.warnings ?? []).toEqual([]);
    expect(u.token()).toEqual(issued);
  });

  it.each([
    ["empty .env", (cwd: string) => writeFileSync(join(cwd, ".env"), "")],
    ["no .env", (cwd: string) => rmSync(join(cwd, ".env"))],
  ])(
    "no Token State and no Client Credentials (%s) → 401 pointing at auth client",
    async (_, setup) => {
      const u = await readyUser({ token: false });
      setup(u.cwd);
      const r = await u.areYou("Minsu");
      expect(r.exitCode).toBe(3);
      expect(r.json()).toMatchObject({
        code: 401,
        reason: "no_credentials",
        data: { warnings: [] },
      });
      expect(r.json().message).toContain("auth client");
    },
  );

  it("tampered Access Token → 401 / exit 3", async () => {
    const u = await readyUser();
    u.setToken({ accessToken: "it.me.and.them" });
    const r = await u.areYou("Minsu");
    expect(r.exitCode).toBe(3);
    expect(r.json()).toMatchObject({
      code: 401,
      reason: "token_rejected",
      data: { warnings: [] },
    });
  });

  it("missing name → 400 / exit 2", async () => {
    const u = await readyUser();
    const r = await run(["action", "are-you"], { home: u.home, cwd: u.cwd });
    expect(r.exitCode).toBe(2);
    expect(r.json()).toMatchObject({ code: 400, reason: "usage", data: { warnings: [] } });
  });

  it("broken Token State → 400 telling to re-issue", async () => {
    const u = await readyUser();
    mkdirSync(join(u.tokenFile, ".."), { recursive: true });
    writeFileSync(u.tokenFile, "{");
    const r = await u.areYou("Minsu");
    expect(r.exitCode).toBe(2);
    expect(r.json()).toMatchObject({ code: 400, reason: "token_invalid", data: { warnings: [] } });
    expect(r.json().message).toContain("auth issue-token");
  });
});

describe("action json failure envelope", () => {
  it("config_invalid is the same reason in en and ko", async () => {
    const home = tempDir();
    mkdirSync(join(home, ".are-you-happy-cli"), { recursive: true });
    writeFileSync(join(home, ".are-you-happy-cli", "config.json"), "{", { mode: 0o600 });
    const en = await run(["action", "are-you", "Minsu"], { home });
    const ko = await run(["action", "are-you", "Minsu"], {
      home,
      env: { ARE_YOU_HAPPY_CLI_LANG: "ko" },
    });
    expect(en.json().reason).toBe("config_invalid");
    expect(ko.json().reason).toBe("config_invalid");
    expect(en.json().message).toContain("Config File is not valid");
    expect(ko.json().message).toContain("설정 파일이 올바르지 않습니다");
    expect(ko.json().message).not.toContain("Config File is not valid");
  });

  it("keeps warnings raised before the failure", async () => {
    const u = await readyUser();
    chmodSync(join(u.home, ".are-you-happy-cli", "config.json"), 0o644);
    u.setToken({ accessToken: "tampered" });
    const r = await u.areYou("Minsu", { env: { ARE_YOU_HAPPY_CLI_LANG: "ja" } });
    expect(r.exitCode).toBe(3);
    expect(r.stderr).toBe("");
    expect(r.json().reason).toBe("token_rejected");
    expect(r.json().data.warnings).toEqual([
      expect.stringContaining("ja"),
      expect.stringContaining("readable by others"),
    ]);
  });

  it("unexpected errors keep warnings and reason unexpected", async () => {
    const u = await readyUser();
    rmSync(u.tokenFile);
    mkdirSync(u.tokenFile);
    const r = await u.areYou("Minsu", { env: { ARE_YOU_HAPPY_CLI_LANG: "ja" } });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toBe("");
    expect(r.stdout.trim().split("\n")).toHaveLength(1);
    expect(r.json()).toMatchObject({
      code: 500,
      reason: "unexpected",
      data: { warnings: [expect.stringContaining("ja")] },
    });
  });
});
