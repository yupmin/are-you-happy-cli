import type { Command } from "@commander-js/extra-typings";
import type { Ctx } from "../context";
import { CliError } from "../errors";
import { assertConfigReadable, assertDotenvReadable, warnIfTooOpen } from "../guards";
import { isLang, LANGUAGES, type Lang, packs } from "../locales";
import { envKey } from "../project";
import { saveConfig } from "../settings/config-file";
import { maskSetting } from "../settings/mask";
import { SETTING_NAMES } from "../settings/resolve";
import { isValidTimeZone } from "../timezone";

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
  const { t, paths, config, settings } = ctx;
  assertConfigReadable(ctx);
  assertDotenvReadable(ctx);
  warnIfTooOpen(ctx, paths.configFile, paths.envFile);

  const rows = SETTING_NAMES.flatMap((name) => {
    const resolved = settings[name];
    if (!resolved) return [];
    const key = envKey(name);
    return [{ key, value: maskSetting(key, resolved.value), source: resolved.source }];
  });
  const { ENVIRONMENTS: _env, ...fileOnly } = config.status === "ok" ? config.config : {};
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

  ctx.result = {
    message: paths.configFile,
    data: { configFile: paths.configFile, settings: rows, fileSettings },
    text,
  };
}

async function configInit(ctx: Ctx, flags: GlobalFlags): Promise<void> {
  const { io, t, out, paths, config } = ctx;
  const { prompt } = io;

  if (flags.lang !== undefined && !isLang(flags.lang)) {
    throw new CliError(400, t.errors.unsupportedLang(flags.lang, LANGUAGES.join(", ")));
  }
  if (flags.timezone !== undefined && !isValidTimeZone(flags.timezone)) {
    throw new CliError(400, t.errors.invalidTimezone(flags.timezone));
  }
  if (!io.interactive && (flags.lang === undefined || flags.timezone === undefined)) {
    throw new CliError(400, t.config.init.needFlags);
  }

  const lang: Lang =
    (flags.lang as Lang | undefined) ??
    (await prompt.select({
      message: t.config.init.language,
      choices: LANGUAGES.map((value) => ({ name: `${packs[value].meta.name} (${value})`, value })),
      default: ctx.lang,
    }));

  const timezone = flags.timezone ?? (await askTimezone(ctx));

  if (config.status !== "missing") {
    if (io.interactive) {
      if (!(await prompt.confirm({ message: t.common.overwrite, default: false }))) {
        ctx.result = { message: t.common.cancelled, data: { saved: false } };
        return;
      }
    } else {
      out.warn(t.warnings.overwritten(paths.configFile));
    }
  } else if (io.interactive) {
    if (
      !(await prompt.confirm({
        message: t.config.init.confirmSave(paths.configFile),
        default: true,
      }))
    ) {
      ctx.result = { message: t.common.cancelled, data: { saved: false } };
      return;
    }
  }

  // Keep File-only Settings and other Environment Settings from a valid existing file.
  const base = config.status === "ok" ? config.config : {};
  saveConfig(paths.configFile, paths.configDir, {
    ...base,
    ENVIRONMENTS: {
      ...base.ENVIRONMENTS,
      [envKey("LANG")]: lang,
      [envKey("TIMEZONE")]: timezone,
    },
  });
  ctx.result = {
    message: t.config.init.saved(paths.configFile),
    data: { saved: true, path: paths.configFile, lang, timezone },
  };
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
