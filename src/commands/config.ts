import type { Command } from "@commander-js/extra-typings";
import type { Ctx } from "../context";
import { REASON } from "../errors";
import { LANGUAGES, type Lang, packs } from "../locales";
import { envKey } from "../project";
import { maskSetting } from "../settings/mask";
import { type Resolved, SETTING_NAMES, type SettingName } from "../settings/resolve";
import { isValidTimeZone } from "../timezone";
import { beforeOverwriteExistingFile, confirmOrCancel, requireWhenNonInteractive } from "./flows";

interface GlobalFlags {
  lang?: string;
  timezone?: string;
}

export function registerConfig(group: Command, ctx: Ctx): void {
  const { t } = ctx;
  group
    .command("init")
    .description(t.config.init.description)
    .action(async (_opts, cmd) => {
      await configInit(ctx, cmd.optsWithGlobals() as GlobalFlags);
    });

  group
    .command("show")
    .description(t.config.show.description)
    .action(() => configShow(ctx));
}

function configShow(ctx: Ctx): void {
  const { t, config, dotenv, settings } = ctx;
  const file = config.read();
  dotenv.check();

  const rows = SETTING_NAMES.flatMap((name) => {
    const resolved = shownSetting(ctx, name, settings[name]);
    if (!resolved) return [];
    const key = envKey(name);
    return [{ key, value: maskSetting(key, resolved.value), source: resolved.source }];
  });
  const { ENVIRONMENTS: _env, ...fileOnly } = file ?? {};
  const fileSettings = Object.entries(fileOnly).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? maskSetting(key, value) : value,
  }));

  const width = Math.max(
    ...rows.map((r) => r.key.length),
    ...fileSettings.map((r) => r.key.length),
  );
  const text = [
    ...rows.map((r) => `${r.key.padEnd(width)} = ${r.value} (${r.source})`),
    "",
    `${t.config.show.fileOnly}:`,
    ...(fileSettings.length
      ? fileSettings.map(
          (r) =>
            `${r.key.padEnd(width)} = ${typeof r.value === "string" ? r.value : JSON.stringify(r.value)}`,
        )
      : [`  ${t.config.show.none}`]),
  ].join("\n");

  ctx.result = { message: text };
}

/**
 * Language and time zone are validated after precedence. A rejected shell, .env, or Config File
 * value is replaced by the default (ctx.lang / ctx.timezone); config show reports that default.
 */
function shownSetting(
  ctx: Ctx,
  name: SettingName,
  resolved: Resolved | undefined,
): Resolved | undefined {
  if (!resolved) return undefined;
  if (name === "LANG" && resolved.value !== ctx.lang) return { value: ctx.lang, source: "default" };
  if (name === "TIMEZONE" && resolved.value !== ctx.timezone) {
    return { value: ctx.timezone, source: "default" };
  }
  return resolved;
}

async function configInit(ctx: Ctx, flags: GlobalFlags): Promise<void> {
  const { io, t, config } = ctx;
  const { prompt } = io;

  requireWhenNonInteractive(ctx, flags.lang !== undefined && flags.timezone !== undefined, {
    message: t.config.init.needFlags,
    reason: REASON.noninteractive,
  });

  const lang: Lang =
    (flags.lang as Lang | undefined) ??
    (await prompt.select({
      message: t.config.init.language,
      choices: LANGUAGES.map((value) => ({ name: `${packs[value].meta.name} (${value})`, value })),
      default: ctx.lang,
    }));

  const timezone = flags.timezone ?? (await askTimezone(ctx));

  if (
    (await beforeOverwriteExistingFile(ctx, {
      exists: config.exists,
      path: config.path,
      overwrittenWarning: t.warnings.overwritten(config.path),
    })) === "cancelled"
  ) {
    return;
  }

  if (!config.exists && io.interactive) {
    if (
      (await confirmOrCancel(ctx, {
        message: t.config.init.confirmSave(config.path),
        default: true,
      })) === "cancelled"
    ) {
      return;
    }
  }

  // Keep File-only Settings and other Environment Settings from a valid existing file.
  const base = config.peek() ?? {};
  config.save({
    ...base,
    ENVIRONMENTS: {
      ...base.ENVIRONMENTS,
      [envKey("LANG")]: lang,
      [envKey("TIMEZONE")]: timezone,
    },
  });
  ctx.result = { message: t.config.init.saved(config.path) };
}

async function askTimezone({ io, t }: Ctx): Promise<string> {
  const system = io.systemTimeZone();
  const choice = await io.prompt.select({
    message: t.config.init.timezone,
    choices: [
      { name: t.config.init.timezoneSystem(system), value: "system" },
      { name: t.config.init.timezoneCustom, value: "custom" },
    ],
  });
  if (choice === "system") return system;
  return io.prompt.input({
    message: t.config.init.timezoneInput,
    validate: (value) => isValidTimeZone(value.trim()) || t.errors.invalidTimezone(value),
  });
}
