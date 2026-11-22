import type { Command } from "@commander-js/extra-typings";
import type { Ctx } from "../context";
import { CliError } from "../errors";
import { isLang, LANGUAGES, type Lang, packs } from "../locales";
import { envKey } from "../project";
import { saveConfig } from "../settings/config-file";
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
