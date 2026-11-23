import { styleText } from "node:util";
import { httpStatusToExitCode } from "./errors";
import type { Io, OutStream } from "./io";

export type Format = "text" | "json";
export const FORMATS: readonly Format[] = ["text", "json"];
// CUSTOMIZE: the only command group with --format; every other command is text (ADR-0003).
export const FORMAT_GROUP = "action";

type Style = Parameters<typeof styleText>[0];

export interface Success {
  message: string;
  data?: Record<string, unknown>;
  /** Human rendering for text mode; defaults to `message`. */
  text?: string;
}

/**
 * The renderer. json: exactly one `{ code, message, data }` envelope on stdout (ADR-0001).
 * text: results on stdout, warnings and errors on stderr.
 */
export class Output {
  private readonly warnings: string[] = [];

  constructor(
    private readonly io: Io,
    readonly format: Format,
    private readonly labels: { warning: string; error: string; hint: string },
  ) {}

  warn(message: string): void {
    if (this.format === "json") this.warnings.push(message);
    else
      this.io.stderr.write(
        `${this.paint(this.io.stderr, "yellow", this.labels.warning)} ${message}\n`,
      );
  }

  success(result: Success): number {
    if (this.format === "json") {
      this.envelope(200, result.message, { ...result.data, warnings: this.warnings });
    } else {
      this.io.stdout.write(`${result.text ?? result.message}\n`);
    }
    return 0;
  }

  failure(status: number, message: string, hint?: string): number {
    if (this.format === "json") {
      this.envelope(status, hint ? `${message} ${hint}` : message, null);
    } else {
      const err = this.io.stderr;
      err.write(`${this.paint(err, "red", this.labels.error)} ${message}\n`);
      if (hint) err.write(`${this.paint(err, "dim", this.labels.hint)} ${hint}\n`);
    }
    return httpStatusToExitCode(status);
  }

  /** Raw text-mode passthrough (commander help, error text). Ignored in json mode. */
  raw(stream: "stdout" | "stderr", text: string): void {
    if (this.format === "text" && text) this.io[stream].write(text);
  }

  private envelope(code: number, message: string, data: unknown): void {
    this.io.stdout.write(`${JSON.stringify({ code, message, data })}\n`);
  }

  private paint(stream: OutStream, style: Style, text: string): string {
    return colorEnabled(this.io, stream) ? styleText(style, text, { validateStream: false }) : text;
  }
}

/** NO_COLOR wins, then FORCE_COLOR, then TTY detection. */
export function colorEnabled(io: Io, stream: OutStream): boolean {
  if (io.env.NO_COLOR !== undefined && io.env.NO_COLOR !== "") return false;
  const force = io.env.FORCE_COLOR;
  if (force !== undefined) return force !== "0" && force !== "false";
  return stream.isTTY;
}
