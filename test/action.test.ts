import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  const tokenFile = join(home, ".are-you-happy-cli", "are-you-happy-cli-state-dir", "token.json");
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

  it("no Config File → 400 / exit 2 telling to run config init", async () => {
    const r = await run(["action", "are-you", "Minsu"]);
    expect(r.exitCode).toBe(2);
    expect(r.json().message).toContain("config init");
  });

  it("no Token State → 401 / exit 3 telling to run auth issue-token", async () => {
    const u = await readyUser({ token: false });
    const r = await u.areYou("Minsu");
    expect(r.exitCode).toBe(3);
    expect(r.json().code).toBe(401);
    expect(r.json().message).toContain("auth issue-token");
  });

  it("tampered Access Token → 401 / exit 3", async () => {
    const u = await readyUser();
    u.setToken({ accessToken: "it.me.and.them" });
    const r = await u.areYou("Minsu");
    expect(r.exitCode).toBe(3);
    expect(r.json()).toMatchObject({ code: 401, data: null });
  });

  it("missing name → 400 / exit 2", async () => {
    const u = await readyUser();
    const r = await run(["action", "are-you"], { home: u.home, cwd: u.cwd });
    expect(r.exitCode).toBe(2);
    expect(r.json().code).toBe(400);
  });

  it("broken Token State → 400 telling to re-issue", async () => {
    const u = await readyUser();
    mkdirSync(join(u.tokenFile, ".."), { recursive: true });
    writeFileSync(u.tokenFile, "{");
    const r = await u.areYou("Minsu");
    expect(r.exitCode).toBe(2);
    expect(r.json().message).toContain("auth issue-token");
  });
});
