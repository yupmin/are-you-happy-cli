import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run, tempDir } from "./helpers";

const creds = (id = "happy-client", secret = "happy-secret") =>
  `ARE_YOU_HAPPY_CLI_CLIENT_ID=${id}\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=${secret}\n`;

function dirs(dotenv?: string) {
  const home = tempDir();
  const cwd = tempDir();
  if (dotenv !== undefined) writeFileSync(join(cwd, ".env"), dotenv, { mode: 0o600 });
  const tokenFile = join(home, ".are-you-happy-cli", "token-dir", "token.json");
  return { home, cwd, tokenFile };
}

describe("auth issue-token", () => {
  it("saves Token State (600) when Client Credentials match", async () => {
    const d = dirs(creds());
    const r = await run(["auth", "issue-token"], { ...d, now: new Date("2026-11-22T14:10:00Z") });
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(readFileSync(d.tokenFile, "utf8"))).toEqual({
      accessToken: "it.me.and.you",
      refreshToken: "it.me.and.you.again",
      expiresAt: "2026-11-22T15:10:00.000Z",
      clientId: "happy-client",
    });
    expect(statSync(d.tokenFile).mode & 0o777).toBe(0o600);
  });

  it("json shows masked tokens and expiresAt in the configured time zone", async () => {
    const d = dirs(creds());
    const r = await run(["auth", "issue-token"], {
      ...d,
      env: { ARE_YOU_HAPPY_CLI_TIMEZONE: "Asia/Seoul" },
      now: new Date("2026-11-22T14:10:00Z"),
    });
    expect(r.json().data).toMatchObject({
      accessToken: "it.m****",
      refreshToken: "it.m****",
      expiresAt: "2026-11-23T00:10:00+09:00",
      clientId: "happy-client",
    });
    expect(r.stdout).not.toContain("it.me.and.you");
  });

  it("wrong Client Credentials → 401 / exit 3", async () => {
    const d = dirs(creds("happy-client", "nope"));
    const r = await run(["auth", "issue-token"], d);
    expect(r.exitCode).toBe(3);
    expect(r.json()).toMatchObject({ code: 401, data: null });
    expect(existsSync(d.tokenFile)).toBe(false);
  });

  it("no Client Credentials → points at auth client", async () => {
    const r = await run(["auth", "issue-token"], dirs());
    expect(r.exitCode).toBe(3);
    expect(r.json().message).toContain("auth client");
  });

  it("re-issues over an existing Token State", async () => {
    const d = dirs(creds());
    mkdirSync(join(d.tokenFile, ".."), { recursive: true });
    writeFileSync(d.tokenFile, "{broken");
    const r = await run(["auth", "issue-token"], d);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(readFileSync(d.tokenFile, "utf8")).accessToken).toBe("it.me.and.you");
  });
});

describe("auth purge-token", () => {
  it("deletes the Token State", async () => {
    const d = dirs(creds());
    await run(["auth", "issue-token"], d);
    const r = await run(["auth", "purge-token"], d);
    expect(r.exitCode).toBe(0);
    expect(existsSync(d.tokenFile)).toBe(false);
    expect(r.json().data.warnings).toEqual([]);
  });

  it("succeeds with a warning when there is nothing to delete", async () => {
    const r = await run(["auth", "purge-token"], dirs());
    expect(r.exitCode).toBe(0);
    expect(r.json().data.warnings).toHaveLength(1);
  });
});
