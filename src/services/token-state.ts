import { rmSync } from "node:fs";
import { z } from "zod";
import { readIfExists, writePrivateFile } from "../settings/private-file";
import type { TokenResponse } from "./api";

const TokenStateSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.iso.datetime({ offset: true }),
  clientId: z.string().min(1),
});

export type TokenState = z.infer<typeof TokenStateSchema>;

export type TokenStateLoad =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "ok"; state: TokenState };

export function loadTokenState(path: string): TokenStateLoad {
  const text = readIfExists(path);
  if (text === undefined) return { status: "missing" };
  try {
    const parsed = TokenStateSchema.safeParse(JSON.parse(text));
    return parsed.success ? { status: "ok", state: parsed.data } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

export function toTokenState(res: TokenResponse, clientId: string, now: Date): TokenState {
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    expiresAt: new Date(now.getTime() + res.expiresIn * 1000).toISOString(),
    clientId,
  };
}

export function saveTokenState(path: string, privateDirs: string[], state: TokenState): void {
  writePrivateFile(path, `${JSON.stringify(state, null, 2)}\n`, privateDirs);
}

/** Returns whether there was anything to delete. */
export function deleteTokenState(path: string): boolean {
  if (readIfExists(path) === undefined) return false;
  rmSync(path);
  return true;
}

export const isExpired = (state: TokenState, now: Date): boolean =>
  Date.parse(state.expiresAt) <= now.getTime();
