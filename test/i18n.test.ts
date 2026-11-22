import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../src/locales";
import { run } from "./helpers";

describe("Language Pack", () => {
  it("selectable languages come from the registered packs", () => {
    expect(LANGUAGES).toEqual(["en", "ko"]);
  });

  it("ARE_YOU_HAPPY_CLI_LANG=ko → Korean help", async () => {
    const r = await run(["--help", "--format", "text"], { env: { ARE_YOU_HAPPY_CLI_LANG: "ko" } });
    expect(r.stdout).toContain("설정 파일");
  });

  it("ARE_YOU_HAPPY_CLI_LANG=en → English help", async () => {
    const r = await run(["--help", "--format", "text"], { env: { ARE_YOU_HAPPY_CLI_LANG: "en" } });
    expect(r.stdout).toContain("manage the Config File");
  });

  it("unsupported language falls back to en with a warning on stderr (text)", async () => {
    const r = await run(["--help", "--format", "text"], { env: { ARE_YOU_HAPPY_CLI_LANG: "ja" } });
    expect(r.stdout).toContain("manage the Config File");
    expect(r.stderr).toMatch(/ja/);
  });

  it("unsupported language warning goes to data.warnings (json)", async () => {
    const r = await run(["--help"], { env: { ARE_YOU_HAPPY_CLI_LANG: "ja" } });
    expect(r.json().data.warnings).toEqual([expect.stringContaining("ja")]);
  });

  it("group help shows human and agent examples from the Language Pack", async () => {
    const r = await run(["config", "--help", "--format", "text"], {
      env: { ARE_YOU_HAPPY_CLI_LANG: "ko" },
    });
    expect(r.stdout).toContain("예시");
    expect(r.stdout).toContain("--format json");
  });
});
