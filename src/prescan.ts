import { FORMATS, type Format } from "./output";

export interface Prescan {
  format?: Format;
  verbose: boolean;
  lang?: string;
  timezone?: string;
}

/**
 * Reads the few global flags needed before commander is built (output format, language).
 * Commander still parses and validates them afterwards.
 */
export function prescan(argv: readonly string[]): Prescan {
  const result: Prescan = { verbose: false };
  const readFlag = (name: string, i: number): [string | undefined, number] => {
    const arg = argv[i] as string;
    if (arg.startsWith(`--${name}=`)) return [arg.slice(name.length + 3), i];
    if (arg === `--${name}`) return [argv[i + 1], i + 1];
    return [undefined, i];
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--") break;
    if (arg === "--verbose") result.verbose = true;
    for (const name of ["format", "lang", "timezone"] as const) {
      const [value, next] = readFlag(name, i);
      if (value === undefined) continue;
      i = next;
      if (name === "format") {
        if ((FORMATS as string[]).includes(value)) result.format = value as Format;
      } else result[name] = value;
    }
  }
  return result;
}
