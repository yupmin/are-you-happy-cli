import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Reads a file, or undefined when it does not exist. */
export function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

/**
 * Writes `content` with mode 600. When `privateDir` is set, that directory (and its parents up
 * to it) is created as 700.
 */
export function writePrivateFile(path: string, content: string, privateDirs: string[] = []): void {
  for (const dir of privateDirs) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { mode: 0o600 });
  chmodSync(path, 0o600);
}

/** True when group or others have any permission bit (i.e. wider than 600). */
export function isTooOpen(path: string): boolean {
  return existsSync(path) && (statSync(path).mode & 0o077) !== 0;
}
