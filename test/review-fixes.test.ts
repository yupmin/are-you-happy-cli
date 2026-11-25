import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { maskValue } from "../src/settings/mask";
import { run, tempDir } from "./helpers";

const NOW = new Date("2026-11-22T14:10:00Z");
const DOTENV =
  "ARE_YOU_HAPPY_CLI_CLIENT_ID=happy-client\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=happy-secret\n";

async function withToken() {
  const home = tempDir();
  const cwd = tempDir();
  await run(["config", "init", "--lang", "en", "--timezone", "UTC"], { home, cwd, now: NOW });
  writeFileSync(join(cwd, ".env"), DOTENV, { mode: 0o600 });
  await run(["auth", "issue-token"], { home, cwd, now: NOW });
  return { home, cwd };
}

describe("Client Credentials come from the cwd .env only", () => {
  it("a shell env secret does not override .env", async () => {
    const { home, cwd } = await withToken();
    const env = { ARE_YOU_HAPPY_CLI_CLIENT_SECRET: "nope", ARE_YOU_HAPPY_CLI_CLIENT_ID: "other" };
    const issued = await run(["auth", "issue-token"], { home, cwd, now: NOW, env });
    expect(issued.exitCode).toBe(0);
    const show = await run(["config", "show"], { home, cwd, env });
    expect(show.stdout).toMatch(/^ARE_YOU_HAPPY_CLI_CLIENT_ID\s*= happy-client \(\.env\)$/m);
  });

  it("config.json ENVIRONMENTS cannot hold Client Credentials", async () => {
    const home = tempDir();
    const cwd = tempDir();
    await run(["config", "init", "--lang", "en", "--timezone", "UTC"], { home, cwd });
    const file = join(home, ".are-you-happy-cli", "config.json");
    writeFileSync(
      file,
      JSON.stringify({
        ENVIRONMENTS: {
          ARE_YOU_HAPPY_CLI_CLIENT_ID: "happy-client",
          ARE_YOU_HAPPY_CLI_CLIENT_SECRET: "happy-secret",
        },
      }),
      { mode: 0o600 },
    );
    const r = await run(["auth", "issue-token"], { home, cwd, now: NOW });
    expect(r.exitCode).toBe(3);
  });

  it("a valid Token State still works from a folder without .env", async () => {
    const { home } = await withToken();
    const r = await run(["action", "are-you", "Minsu"], { home, cwd: tempDir(), now: NOW });
    expect(r.exitCode).toBe(0);
    expect(r.json().data.warnings ?? []).toEqual([]);
  });
});

describe("invalid global flags are 400", () => {
  it("--timezone Bogus/Zone on an action", async () => {
    const { home, cwd } = await withToken();
    const r = await run(["--timezone", "Bogus/Zone", "action", "are-you", "Minsu"], { home, cwd });
    expect(r.exitCode).toBe(2);
    expect(r.json()).toMatchObject({ code: 400, data: null });
    expect(r.json().message).toContain("Bogus/Zone");
  });

  it("--lang fr", async () => {
    const r = await run(["--lang", "fr", "config", "show"]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("fr");
  });

  it("an invalid time zone from env still falls back with a warning", async () => {
    const r = await run(["config", "show"], {
      env: { ARE_YOU_HAPPY_CLI_TIMEZONE: "Bogus/Zone" },
      systemTimeZone: "Asia/Seoul",
    });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("Bogus/Zone");
    expect(r.stdout).toMatch(/ARE_YOU_HAPPY_CLI_TIMEZONE\s*= Asia\/Seoul \(default\)/);
    expect(r.stdout).not.toContain("Bogus/Zone");
  });
});

describe("masking", () => {
  it("never shows a short secret in full", () => {
    expect(maskValue("abc")).toBe("****");
    expect(maskValue("abcd")).toBe("****");
    expect(maskValue("abcde")).toBe("abcd****");
  });
});
