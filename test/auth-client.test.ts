import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { describe, expect, it } from "vitest";
import { run, tempDir } from "./helpers";

const ID = "ARE_YOU_HAPPY_CLI_CLIENT_ID";
const SECRET = "ARE_YOU_HAPPY_CLI_CLIENT_SECRET";

describe("auth client", () => {
  it("asks ID then SECRET and saves them to the cwd .env with mode 600", async () => {
    const cwd = tempDir();
    const r = await run(["auth", "client"], {
      cwd,
      tty: true,
      answers: ["happy-client", "happy-secret"],
    });
    expect(r.exitCode).toBe(0);
    expect(r.asked).toEqual(["ID", "SECRET"]);
    const env = join(cwd, ".env");
    expect(readFileSync(env, "utf8")).toBe(`${ID}=happy-client\n${SECRET}=happy-secret\n`);
    expect(statSync(env).mode & 0o777).toBe(0o600);
    expect(r.stdout + r.stderr).not.toContain("happy-secret");
  });

  it("keeps other keys in .env", async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, ".env"), "# mine\nOTHER=1\n");
    await run(["auth", "client"], { cwd, tty: true, answers: ["a", "b"] });
    expect(readFileSync(join(cwd, ".env"), "utf8")).toBe(`# mine\nOTHER=1\n${ID}=a\n${SECRET}=b\n`);
  });

  it("existing credentials: warns, asks, and replaces in place when confirmed", async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, ".env"), `${ID}=old\nOTHER=1\n${SECRET}=old-secret\n`);
    const r = await run(["auth", "client"], {
      cwd,
      tty: true,
      answers: [true, "new", "new-secret"],
    });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toMatch(/Warning/);
    expect(readFileSync(join(cwd, ".env"), "utf8")).toBe(
      `${ID}=new\nOTHER=1\n${SECRET}=new-secret\n`,
    );
  });

  it("duplicate keys: every line takes the new value, so the parsed value is the new one", async () => {
    const cwd = tempDir();
    writeFileSync(
      join(cwd, ".env"),
      `${ID}=first\nOTHER=1\nexport ${ID}=second\n${SECRET}=old-secret\n${SECRET}=older\n`,
    );
    const r = await run(["auth", "client"], {
      cwd,
      tty: true,
      answers: [true, "new-id", "new-secret"],
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("new-id");
    const file = readFileSync(join(cwd, ".env"), "utf8");
    expect(file).toBe(
      `${ID}=new-id\nOTHER=1\n${ID}=new-id\n${SECRET}=new-secret\n${SECRET}=new-secret\n`,
    );
    expect(parseEnv(file)).toMatchObject({
      [ID]: "new-id",
      [SECRET]: "new-secret",
      OTHER: "1",
    });
  });

  it("existing credentials: declining changes nothing", async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, ".env"), `${ID}=old\n`);
    const r = await run(["auth", "client"], { cwd, tty: true, answers: [false] });
    expect(r.exitCode).toBe(0);
    expect(readFileSync(join(cwd, ".env"), "utf8")).toBe(`${ID}=old\n`);
  });

  it("non-TTY → 400, interactive only", async () => {
    const r = await run(["auth", "client"]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("interactive only");
  });

  it("rejects empty ID and SECRET", async () => {
    const r = await run(["auth", "client"], { tty: true, answers: ["", "id", " ", "secret"] });
    expect(r.exitCode).toBe(0);
    expect(r.rejected).toHaveLength(2);
  });

  it("Ctrl+C → 130 and .env untouched", async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, ".env"), "OTHER=1\n");
    const r = await run(["auth", "client"], { cwd, tty: true, answers: ["id", { cancel: true }] });
    expect(r.exitCode).toBe(130);
    expect(readFileSync(join(cwd, ".env"), "utf8")).toBe("OTHER=1\n");
  });

  it("takes no flags for the secret", async () => {
    const r = await run(["auth", "client", "--secret", "x"], { tty: true });
    expect(r.exitCode).toBe(2);
  });
});
