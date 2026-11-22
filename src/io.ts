export interface OutStream {
  write(chunk: string): void;
  isTTY: boolean;
}

export type Validate = (value: string) => true | string;

/** Subset of @inquirer/prompts used by the CLI, injectable for tests. */
export interface Prompter {
  input(opts: { message: string; default?: string; validate?: Validate }): Promise<string>;
  password(opts: { message: string; validate?: Validate }): Promise<string>;
  select<T extends string>(opts: {
    message: string;
    choices: { name: string; value: T }[];
    default?: T;
  }): Promise<T>;
  confirm(opts: { message: string; default?: boolean }): Promise<boolean>;
}

/** Everything the CLI touches in the outside world. `runCli` gets one of these. */
export interface Io {
  env: Record<string, string | undefined>;
  cwd: string;
  homedir: string;
  stdout: OutStream;
  stderr: OutStream;
  /** True when prompts can be shown (stdin and stdout are TTYs). */
  interactive: boolean;
  prompt: Prompter;
  now(): Date;
  random(): number;
  systemTimeZone(): string;
}
