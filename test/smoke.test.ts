import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

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
    const r = exec("--nope");
    expect(r.status).toBe(2);
    expect(JSON.parse(r.stdout).code).toBe(400);
  });
});
