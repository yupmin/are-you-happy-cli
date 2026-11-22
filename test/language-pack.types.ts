// Type-level tests, checked by `npm run typecheck` (not vitest).
import type { LanguagePack } from "../src/locales";
import { en } from "../src/locales/en";

const { meta: _meta, ...withoutMeta } = en;
// @ts-expect-error a Language Pack missing a top-level key does not compile
export const missingKey: LanguagePack = withoutMeta;

// @ts-expect-error a Language Pack missing a nested key does not compile
export const missingNested: LanguagePack = { ...en, common: { overwrite: "x" } };

export const complete: LanguagePack = en;
