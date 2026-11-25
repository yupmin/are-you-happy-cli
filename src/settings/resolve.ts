import { envKey } from "../project";

export type Source = "flag" | "shell env" | ".env" | "config.json" | "default";

export interface Layer {
  source: Source;
  values: Readonly<Record<string, string | undefined>>;
}

export interface Resolved {
  value: string;
  source: Source;
}

// CUSTOMIZE: the Environment Settings this CLI knows about (name without prefix).
export const SETTING_NAMES = ["LANG", "TIMEZONE", "CLIENT_ID", "CLIENT_SECRET", "API_URL"] as const;
export type SettingName = (typeof SETTING_NAMES)[number];

export type Settings = Record<SettingName, Resolved | undefined>;

/** Client Credentials live in the cwd .env only (spec): never shell env, flags or config.json. */
const DOTENV_ONLY: ReadonlySet<SettingName> = new Set(["CLIENT_ID", "CLIENT_SECRET"]);

/** Layers are ordered highest priority first; the first non-empty value wins. */
export function resolveSettings(
  layers: Layer[],
  defaults: Partial<Record<SettingName, string>>,
): Settings {
  const settings = {} as Settings;
  for (const name of SETTING_NAMES) {
    const key = envKey(name);
    const hit = layers.find(
      (layer) =>
        (!DOTENV_ONLY.has(name) || layer.source === ".env") &&
        layer.values[key] !== undefined &&
        layer.values[key] !== "",
    );
    const fallback = defaults[name];
    settings[name] = hit
      ? { value: hit.values[key] as string, source: hit.source }
      : fallback !== undefined
        ? { value: fallback, source: "default" }
        : undefined;
  }
  return settings;
}
