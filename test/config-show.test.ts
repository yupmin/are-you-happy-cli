import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { maskSetting } from "../src/settings/mask";
import { run, tempDir } from "./helpers";

function setup(opts: { config?: unknown; rawConfig?: string; dotenv?: string } = {}) {
  const home = tempDir();
  const cwd = tempDir();
  if (opts.config !== undefined || opts.rawConfig !== undefined) {
    mkdirSync(join(home, ".are-you-happy-cli"), { mode: 0o700 });
    writeFileSync(
      join(home, ".are-you-happy-cli", "config.json"),
      opts.rawConfig ?? JSON.stringify(opts.config),
      { mode: 0o600 },
    );
  }
  if (opts.dotenv !== undefined) writeFileSync(join(cwd, ".env"), opts.dotenv, { mode: 0o600 });
  return { home, cwd };
}

/** One `KEY = value (source)` line of the text output. */
function setting(stdout: string, name: string) {
  const key = `ARE_YOU_HAPPY_CLI_${name}`;
  const match = stdout.match(new RegExp(`^${key}\\s*= (.*) \\((.+)\\)$`, "m"));
  return match ? { key, value: match[1], source: match[2] } : undefined;
}

describe("config show", () => {
  it("works without a Config File using defaults", async () => {
    const r = await run(["config", "show"], { ...setup(), systemTimeZone: "Europe/Paris" });
    expect(r.exitCode).toBe(0);
    expect(setting(r.stdout, "LANG")).toEqual({
      key: "ARE_YOU_HAPPY_CLI_LANG",
      value: "en",
      source: "default",
    });
    expect(setting(r.stdout, "TIMEZONE")).toMatchObject({
      value: "Europe/Paris",
      source: "default",
    });
  });

  it("priority: flag > shell env > .env > config.json > default", async () => {
    const dirs = setup({
      config: { ENVIRONMENTS: { ARE_YOU_HAPPY_CLI_LANG: "ko", ARE_YOU_HAPPY_CLI_TIMEZONE: "UTC" } },
      dotenv: "ARE_YOU_HAPPY_CLI_LANG=en\nARE_YOU_HAPPY_CLI_TIMEZONE=Asia/Tokyo\n",
    });
    const data = (argv: string[], env = {}) =>
      run(["config", "show", ...argv], { ...dirs, env }).then((r) => r.stdout);

    expect(setting(await data([]), "TIMEZONE")).toMatchObject({
      value: "Asia/Tokyo",
      source: ".env",
    });
    expect(
      setting(await data([], { ARE_YOU_HAPPY_CLI_TIMEZONE: "Europe/Paris" }), "TIMEZONE"),
    ).toMatchObject({ value: "Europe/Paris", source: "shell env" });
    expect(
      setting(
        await data(["--timezone", "America/New_York"], {
          ARE_YOU_HAPPY_CLI_TIMEZONE: "Europe/Paris",
        }),
        "TIMEZONE",
      ),
    ).toMatchObject({ value: "America/New_York", source: "flag" });

    const configOnly = setup({ config: { ENVIRONMENTS: { ARE_YOU_HAPPY_CLI_LANG: "ko" } } });
    const r = await run(["config", "show"], configOnly);
    expect(setting(r.stdout, "LANG")).toMatchObject({ value: "ko", source: "config.json" });
  });

  it("never searches parent folders for .env", async () => {
    const parent = tempDir();
    writeFileSync(join(parent, ".env"), "ARE_YOU_HAPPY_CLI_LANG=ko\n");
    const cwd = join(parent, "child");
    mkdirSync(cwd);
    const r = await run(["config", "show"], { cwd });
    expect(setting(r.stdout, "LANG")?.source).toBe("default");
  });

  it("shows File-only Settings, which env vars cannot set", async () => {
    const r = await run(["config", "show"], {
      ...setup({ config: { ENVIRONMENTS: {}, mode: "CRAZY" } }),
      env: { ARE_YOU_HAPPY_CLI_MODE: "CALM" },
    });
    expect(r.stdout).toMatch(/File-only Settings:\nmode\s*= CRAZY$/m);
    expect(r.stdout).not.toContain("CALM");
  });

  it("masks SECRET/TOKEN keys, shows the Client ID", async () => {
    const r = await run(["config", "show"], {
      ...setup({
        dotenv:
          "ARE_YOU_HAPPY_CLI_CLIENT_ID=happy-client\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=happy-secret\n",
      }),
    });
    expect(setting(r.stdout, "CLIENT_ID")?.value).toBe("happy-client");
    expect(setting(r.stdout, "CLIENT_SECRET")?.value).toBe("happ****");
    expect(r.stdout).not.toContain("happy-secret");
  });

  it("masking is one function", () => {
    expect(maskSetting("ARE_YOU_HAPPY_CLI_API_TOKEN", "abcdefgh")).toBe("abcd****");
    expect(maskSetting("ARE_YOU_HAPPY_CLI_CLIENT_ID", "abcdefgh")).toBe("abcdefgh");
  });

  it.each([
    ["broken json", "{nope"],
    ["schema mismatch", JSON.stringify({ ENVIRONMENTS: { ARE_YOU_HAPPY_CLI_LANG: 3 } })],
  ])("Config File %s → 400 telling to rerun config init", async (_name, rawConfig) => {
    const r = await run(["config", "show"], setup({ rawConfig }));
    expect(r.exitCode).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("config init");
  });

  it("warns when Config File or .env is wider than 600", async () => {
    const dirs = setup({ config: { ENVIRONMENTS: {} }, dotenv: "A=1\n" });
    chmodSync(join(dirs.home, ".are-you-happy-cli", "config.json"), 0o644);
    chmodSync(join(dirs.cwd, ".env"), 0o640);
    const r = await run(["config", "show"], dirs);
    expect(r.exitCode).toBe(0);
    expect(r.stderr.match(/^Warning:/gm)).toHaveLength(2);
  });
});
