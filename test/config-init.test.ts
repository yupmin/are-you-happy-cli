import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run, tempDir } from "./helpers";

const mode = (p: string) => statSync(p).mode & 0o777;
const readConfig = (p: string) => JSON.parse(readFileSync(p, "utf8"));

describe("config init", () => {
  it("saves under $XDG_CONFIG_HOME/are-you-happy-cli with 600/700", async () => {
    const xdg = tempDir();
    const r = await run(["config", "init", "--lang", "ko", "--timezone", "Asia/Seoul"], {
      env: { XDG_CONFIG_HOME: xdg },
    });
    expect(r.exitCode).toBe(0);
    const file = join(xdg, "are-you-happy-cli", "config.json");
    expect(readConfig(file)).toEqual({
      ENVIRONMENTS: { ARE_YOU_HAPPY_CLI_LANG: "ko", ARE_YOU_HAPPY_CLI_TIMEZONE: "Asia/Seoul" },
    });
    expect(mode(file)).toBe(0o600);
    expect(mode(join(xdg, "are-you-happy-cli"))).toBe(0o700);
    expect(r.json().data).toMatchObject({ path: file, lang: "ko", timezone: "Asia/Seoul" });
  });

  it("falls back to ~/.are-you-happy-cli without XDG_CONFIG_HOME", async () => {
    const home = tempDir();
    await run(["config", "init", "--lang", "en", "--timezone", "UTC"], { home });
    expect(existsSync(join(home, ".are-you-happy-cli", "config.json"))).toBe(true);
  });

  it("interactive: language → system timezone → confirm → save", async () => {
    const home = tempDir();
    const r = await run(["config", "init", "--format", "text"], {
      home,
      tty: true,
      answers: ["ko", "system", true],
      systemTimeZone: "Europe/Paris",
    });
    expect(r.exitCode).toBe(0);
    expect(r.asked).toHaveLength(3);
    expect(readConfig(join(home, ".are-you-happy-cli", "config.json")).ENVIRONMENTS).toEqual({
      ARE_YOU_HAPPY_CLI_LANG: "ko",
      ARE_YOU_HAPPY_CLI_TIMEZONE: "Europe/Paris",
    });
  });

  it("interactive: typed timezone is validated with Intl", async () => {
    const r = await run(["config", "init", "--lang", "en", "--format", "text"], {
      tty: true,
      answers: ["custom", "Mars/Olympus"],
    });
    expect(r.exitCode).toBe(1); // scripted prompter surfaces the rejected validation
    expect(r.asked).toHaveLength(2);
  });

  it("rejects an unsupported --lang with 400", async () => {
    const r = await run(["config", "init", "--lang", "ja", "--timezone", "UTC"]);
    expect(r.exitCode).toBe(2);
    expect(r.json().code).toBe(400);
  });

  it("rejects an invalid --timezone with 400", async () => {
    const r = await run(["config", "init", "--lang", "en", "--timezone", "Mars/Olympus"]);
    expect(r.exitCode).toBe(2);
  });

  it("non-TTY without the needed flags → 400 and no prompt", async () => {
    const r = await run(["config", "init", "--lang", "en"]);
    expect(r.exitCode).toBe(2);
    expect(r.asked).toEqual([]);
  });

  it("non-TTY overwrite: overwrites, keeps File-only Settings, warns", async () => {
    const home = tempDir();
    const dir = join(home, ".are-you-happy-cli");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "config.json"),
      JSON.stringify({ ENVIRONMENTS: { ARE_YOU_HAPPY_CLI_LANG: "en" }, mode: "CRAZY" }),
    );
    const r = await run(["config", "init", "--lang", "ko", "--timezone", "UTC"], { home });
    expect(r.exitCode).toBe(0);
    expect(r.json().data.warnings).toHaveLength(1);
    expect(readConfig(join(dir, "config.json"))).toEqual({
      ENVIRONMENTS: { ARE_YOU_HAPPY_CLI_LANG: "ko", ARE_YOU_HAPPY_CLI_TIMEZONE: "UTC" },
      mode: "CRAZY",
    });
  });

  it("TTY overwrite asks first; declining leaves the file alone", async () => {
    const home = tempDir();
    await run(["config", "init", "--lang", "en", "--timezone", "UTC"], { home });
    const file = join(home, ".are-you-happy-cli", "config.json");
    const before = readFileSync(file, "utf8");
    const r = await run(
      ["config", "init", "--lang", "ko", "--timezone", "UTC", "--format", "text"],
      {
        home,
        tty: true,
        answers: [false],
      },
    );
    expect(r.exitCode).toBe(0);
    expect(r.asked[0]).toMatch(/overwrite|덮어/i);
    expect(readFileSync(file, "utf8")).toBe(before);
  });

  it("Ctrl+C at the confirm prompt → 130 and nothing written", async () => {
    const home = tempDir();
    const r = await run(["config", "init", "--format", "text"], {
      home,
      tty: true,
      answers: ["ko", "system", { cancel: true }],
    });
    expect(r.exitCode).toBe(130);
    expect(r.stdout + r.stderr).toBe("");
    expect(existsSync(join(home, ".are-you-happy-cli", "config.json"))).toBe(false);
  });

  it("after saving, --help uses the saved language", async () => {
    const home = tempDir();
    await run(["config", "init", "--lang", "ko", "--timezone", "UTC"], { home });
    const r = await run(["--help", "--format", "text"], { home });
    expect(r.stdout).toContain("설정 파일");
  });

  it("group without subcommand → translated 400", async () => {
    const r = await run(["config"], { env: { ARE_YOU_HAPPY_CLI_LANG: "ko" } });
    expect(r.exitCode).toBe(2);
    expect(r.json().message).toBe("하위 명령이 필요합니다.");
  });
});
