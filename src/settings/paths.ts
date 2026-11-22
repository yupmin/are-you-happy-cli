import { join } from "node:path";
import type { Io } from "../io";
import { PROJECT_KEYWORD } from "../project";

export interface Paths {
  configDir: string;
  configFile: string;
  tokenDir: string;
  tokenFile: string;
  envFile: string;
}

export function resolvePaths(io: Io): Paths {
  const xdg = io.env.XDG_CONFIG_HOME;
  const configDir = xdg ? join(xdg, PROJECT_KEYWORD) : join(io.homedir, `.${PROJECT_KEYWORD}`);
  const tokenDir = join(configDir, `${PROJECT_KEYWORD}-state-dir`);
  return {
    configDir,
    configFile: join(configDir, "config.json"),
    tokenDir,
    tokenFile: join(tokenDir, "token.json"),
    // Only the cwd: parent folders are never searched.
    envFile: join(io.cwd, ".env"),
  };
}
