// CUSTOMIZE: the Project Keyword. Executable name, Config File folder and env prefix all derive from it.
export const PROJECT_KEYWORD = "are-you-happy-cli";

export const BIN_NAME = PROJECT_KEYWORD;
export const ENV_PREFIX = `${PROJECT_KEYWORD.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_`;

export const envKey = (name: string): string => `${ENV_PREFIX}${name}`;
