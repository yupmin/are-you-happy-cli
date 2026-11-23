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

  it("shows expiresAt in the configured time zone and never the tokens", async () => {
    const d = dirs(creds());
    const r = await run(["auth", "issue-token"], {
      ...d,
      env: { ARE_YOU_HAPPY_CLI_TIMEZONE: "Asia/Seoul" },
      now: new Date("2026-11-22T14:10:00Z"),
    });
    expect(r.stdout).toContain("Nov 23, 2026, 12:10 AM (Asia/Seoul)");
    expect(r.stdout + r.stderr).not.toContain("it.me.and.you");
  });

  it("wrong Client Credentials → 401 / exit 3", async () => {
    const d = dirs(creds("happy-client", "nope"));
    const r = await run(["auth", "issue-token"], d);
    expect(r.exitCode).toBe(3);
    expect(r.stderr).toContain("rejected");
    expect(existsSync(d.tokenFile)).toBe(false);
  });

  it("no Client Credentials → points at auth client", async () => {
    const r = await run(["auth", "issue-token"], dirs());
    expect(r.exitCode).toBe(3);
    expect(r.stderr).toContain("auth client");
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
    expect(r.stderr).toBe("");
  });

  it("succeeds with a warning when there is nothing to delete", async () => {
    const r = await run(["auth", "purge-token"], dirs());
    expect(r.exitCode).toBe(0);
    expect(r.stderr.match(/^Warning:/gm)).toHaveLength(1);
  });
});
