import { en } from "./en";
import type { Widen } from "./types";

export type LanguagePack = Widen<typeof en>;

// Selectable languages are exactly the registered Language Packs.
export const packs = { en } satisfies Record<string, LanguagePack>;

export type Lang = keyof typeof packs;
export const LANGUAGES = Object.keys(packs) as Lang[];
export const DEFAULT_LANG: Lang = "en";

export const isLang = (value: string): value is Lang => Object.hasOwn(packs, value);
