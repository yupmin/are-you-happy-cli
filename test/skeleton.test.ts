import { describe, expect, it } from "vitest";
import { httpStatusToExitCode } from "../src/errors";
import { run } from "./helpers";

describe("skeleton", () => {
  it("--help lists the three groups and exits 0", async () => {
    const r = await run(["--help", "--format", "text"]);
    expect(r.exitCode).toBe(0);
    for (const group of ["config", "auth", "action"]) expect(r.stdout).toContain(group);
  });

  it("--version prints the package version", async () => {
    const r = await run(["--version", "--format", "text"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("defaults to json when stdout is not a TTY and wraps help in one envelope", async () => {
    const r = await run(["--help"]);
    const env = r.json();
    expect(env.code).toBe(200);
    expect(env.data.help).toContain("config");
    expect(env.data.warnings).toEqual([]);
  });

  it("defaults to text when stdout is a TTY", async () => {
    const r = await run(["--version"], { tty: true });
    expect(() => JSON.parse(r.stdout)).toThrow();
  });

  it("--format beats TTY detection", async () => {
    const r = await run(["--version", "--format", "json"], { tty: true });
    expect(r.json().data.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("unknown option in json mode → single 400 envelope, exit 2, data null", async () => {
    const r = await run(["--nope"]);
    expect(r.exitCode).toBe(2);
    const env = r.json();
    expect(env.code).toBe(400);
    expect(env.data).toBeNull();
    expect(r.stdout.trim().split("\n")).toHaveLength(1);
  });

  it("unknown command in text mode → stderr with help hint, exit 2", async () => {
    const r = await run(["bogus", "--format", "text"]);
    expect(r.exitCode).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr).toMatch(/unknown command/);
    expect(r.stderr).toMatch(/--help/);
  });

  it("json output never contains ANSI escapes", async () => {
    const r = await run(["--nope"], { env: { FORCE_COLOR: "1" } });
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
    const r = await broken(["--format", "text"]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--verbose");
    expect(r.stderr).not.toMatch(/\n\s+at /);
  });

  it("--verbose prints the stack trace to stderr, envelope stays on stdout", async () => {
    const r = await broken(["--verbose"]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/\n\s+at /);
    expect(r.json()).toMatchObject({ code: 500, data: null });
  });
});
