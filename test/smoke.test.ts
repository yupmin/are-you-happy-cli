import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { tempDir } from "./helpers";

const root = join(import.meta.dirname, "..");
const bin = join(root, "dist", "cli.js");

describe("built binary", () => {
  beforeAll(() => {
    const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
    expect(build.status, build.stderr).toBe(0);
    expect(existsSync(bin)).toBe(true);
  }, 60_000);

  const exec = (...args: string[]) =>
    spawnSync(process.execPath, [bin, ...args], {
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    });

  it("--help exits 0", () => {
    expect(exec("--help").status).toBe(0);
  });

  it("unknown option exits 2", () => {
    const r = exec("action", "--nope");
    expect(r.status).toBe(2);
    expect(JSON.parse(r.stdout).code).toBe(400);
  });

  it("the packed tarball installs and runs --help", () => {
    const out = tempDir();
    const pack = spawnSync(
      "npm",
      ["pack", "--ignore-scripts", "--pack-destination", out, "--json"],
      {
        cwd: root,
        encoding: "utf8",
      },
    );
    expect(pack.status, pack.stderr).toBe(0);
    const [info] = JSON.parse(pack.stdout) as { filename: string; files: { path: string }[] }[];
    const files = info?.files.map((f) => f.path) ?? [];
    expect(files).toContain("dist/cli.js");
    expect(files).toContain("skills/are-you-happy-cli/SKILL.md");
    expect(files.some((f) => f.startsWith("src/") || f.startsWith("test/"))).toBe(false);
    expect(files.some((f) => f.startsWith(".cursor/"))).toBe(false);

    const app = tempDir();
    const install = spawnSync(
      "npm",
      ["install", "--no-audit", "--no-fund", join(out, info?.filename ?? "")],
      { cwd: app, encoding: "utf8" },
    );
    expect(install.status, install.stderr).toBe(0);
    const help = spawnSync(join(app, "node_modules", ".bin", "are-you-happy-cli"), ["--help"], {
      cwd: app,
      encoding: "utf8",
    });
    expect(help.status, help.stderr).toBe(0);
    expect(help.stdout).toContain("action");
  }, 120_000);
});
