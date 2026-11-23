import { describe, expect, it } from "vitest";
import { httpStatusToExitCode } from "../src/errors";
import { run } from "./helpers";

describe("skeleton", () => {
  it("--help lists the three groups and exits 0", async () => {
    const r = await run(["--help"]);
    expect(r.exitCode).toBe(0);
    for (const group of ["config", "auth", "action"]) expect(r.stdout).toContain(group);
  });

  it("--version prints the package version", async () => {
    const r = await run(["--version"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("outside the action group: always text, even when stdout is not a TTY", async () => {
    const r = await run(["--help"]);
    expect(() => JSON.parse(r.stdout)).toThrow();
    expect(r.stdout).toContain("Usage:");
  });

  it.each([
    [["--format", "json", "config", "show"]],
    [["config", "show", "--format", "json"]],
    [["auth", "purge-token", "--format", "text"]],
  ])("--format outside the action group is an unknown option: %j", async (argv) => {
    const r = await run(argv);
    expect(r.exitCode).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr).toMatch(/unknown option '--format'/);
  });

  it("action group: defaults to json when stdout is not a TTY and wraps help in one envelope", async () => {
    const r = await run(["action", "--help"]);
    const env = r.json();
    expect(env.code).toBe(200);
    expect(env.data.help).toContain("are-you");
    expect(env.data.warnings).toEqual([]);
  });

  it("action group: defaults to text when stdout is a TTY", async () => {
    const r = await run(["action", "--help"], { tty: true });
    expect(() => JSON.parse(r.stdout)).toThrow();
  });

  it.each([[["action", "--format", "json", "--help"]], [["action", "--help", "--format=json"]]])(
    "action group: --format beats TTY detection: %j",
    async (argv) => {
      const r = await run(argv, { tty: true });
      expect(r.json().data.help).toContain("are-you");
    },
  );

  it("action group: unknown option in json mode → single 400 envelope, exit 2, data null", async () => {
    const r = await run(["action", "--nope"]);
    expect(r.exitCode).toBe(2);
    const env = r.json();
    expect(env.code).toBe(400);
    expect(env.data).toBeNull();
    expect(r.stdout.trim().split("\n")).toHaveLength(1);
  });

  it("--format before the action group is a root unknown option, reported by the action format rule", async () => {
    const r = await run(["--format", "json", "action", "are-you", "Minsu"]);
    expect(r.exitCode).toBe(2);
    expect(r.json()).toMatchObject({ code: 400, data: null });
    expect(r.json().message).toMatch(/unknown option '--format'/);
  });

  it("unknown command → stderr with help hint, exit 2", async () => {
    const r = await run(["bogus"]);
    expect(r.exitCode).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr).toMatch(/unknown command/);
    expect(r.stderr).toMatch(/--help/);
  });

  it("json output never contains ANSI escapes", async () => {
    const r = await run(["action", "--nope"], { env: { FORCE_COLOR: "1" } });
    expect(r.stdout).not.toContain("\u001b[");
  });
});

describe("httpStatusToExitCode", () => {
  it.each([
    [200, 0],
    [204, 0],
    [400, 2],
    [401, 3],
    [403, 3],
    [404, 1],
    [500, 1],
  ])("%i → %i", (status, code) => {
    expect(httpStatusToExitCode(status)).toBe(code);
  });
});

describe("unexpected errors (bugs)", () => {
  // Config dir path is occupied by a regular file → fs throws an unexpected error.
  const broken = async (extra: string[]) => {
    const { writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tempDir } = await import("./helpers");
    const xdg = tempDir();
    writeFileSync(join(xdg, "are-you-happy-cli"), "not a dir");
    return run(["config", "init", "--lang", "en", "--timezone", "UTC", ...extra], {
      env: { XDG_CONFIG_HOME: xdg },
    });
  };

  it("exit 1 with a --verbose hint and no stack", async () => {
    const r = await broken([]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--verbose");
    expect(r.stderr).not.toMatch(/\n\s+at /);
  });

  it("--verbose prints the stack trace to stderr", async () => {
    const r = await broken(["--verbose"]);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe("");
    expect(r.stderr).toMatch(/\n\s+at /);
  });
});
