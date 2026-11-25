# Coding Standards

Read during code review. Rules here are judgement calls; anything mechanical lives in `biome.json`, `tsconfig.json`, or the pre-commit hook instead.

## Google TypeScript Style

TypeScript style follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html). Mechanical rules are Biome (`biome.json`), not a second linter. The formatter stays as it was (spaces, width 2, line width 100, double quotes). Biome's default semicolon setting (`always`) already matches the guide's ban on relying on automatic semicolon insertion. [ADR-0008](docs/adr/0008-google-ts-style.md) records the choices Biome cannot express.

| Guide | Biome |
| --- | --- |
| Exports: no default exports | `style/noDefaultExport`. Off for `*.config.ts` only: tsup and Vitest require a default export |
| Use modules, not `namespace` | `style/noNamespace` |
| `const` by default, never `var`, one variable per declaration, no use before declaration | `style/useConst`, `suspicious/noVar`, `style/useSingleVarDeclarator`, `correctness/noInvalidUseBeforeDeclaration` |
| `===` / `!==`. `== null` may mean null or undefined | `suspicious/noDoubleEquals` with `ignoreNull: true` |
| No `any` without a documented reason | `suspicious/noExplicitAny` (tests included; suppress with a comment that says why) |
| No `!` non-null assertion without a reason | `style/noNonNullAssertion` |
| `import type` / `export type` for type-only symbols | `style/useImportType`, `style/useExportType` (`verbatimModuleSyntax` already requires this) |
| Naming: ASCII; `UpperCamelCase` types; `lowerCamelCase` variables, functions, parameters, members; `CONSTANT_CASE` for module-level constants and enum values | `style/useNamingConvention` (`requireAscii: true`; enum members `CONSTANT_CASE`). Defaults already allow `CONSTANT_CASE` on module-level `const` |
| Object types use `interface`, not `type X = { ... }` | `style/useConsistentTypeDefinitions` `style: "interface"` (unions, tuples, and primitives may stay `type`) |
| `readonly` on class properties that are never reassigned after construction | `style/useReadonlyClassProperties` `checkAllProperties: true` |
| No `Array` / `Object` constructors, no `new String` / `Boolean` / `Number` | `style/useConsistentBuiltinInstantiation` |
| No wrapper types `String`, `Boolean`, `Number`, `Object`, and no `{}` as a type | `complexity/noBannedTypes`. The same rule also flags `Function`, which the guide does not name; Biome cannot split that list |
| No `@ts-ignore` | `suspicious/noTsIgnore` |
| No `const enum`, `debugger`, `with`, or `eval`; no `require` / `module.exports` | `suspicious/noConstEnum`, `suspicious/noDebugger`, `suspicious/noWith`, `security/noGlobalEval`, `style/noCommonJs` |
| `throw new Error`, and throw only `Error`s | `style/useThrowNewError`, `style/useThrowOnlyError` |
| `switch` has a `default`, and it is last. Non-empty cases do not fall through | `style/useDefaultSwitchClause`, `suspicious/useDefaultSwitchClauseLast`. Empty fall-through stays allowed by the recommended `suspicious/noFallthroughSwitchClause` |
| `for-in` must filter inherited keys | `suspicious/useGuardForIn` |
| Leave out trivial inferred annotations (`let count: number = 0`) | `style/noInferrableTypes` |

The recommended preset also bans assignment inside expressions, including the parenthesized form the guide allows (`while ((x = next()))`). That preset stays on.

These guide rules are not enforced, because Biome has no matching rule or only a stricter one:

- `export let` is forbidden. No Biome rule.
- `#private` fields are forbidden; use TypeScript `private`. No Biome rule.
- `T[]` for simple types and `Array<T>` for complex ones. `useConsistentArrayType` can only force one spelling.
- `@ts-expect-error` and `@ts-nocheck`. `noTsIgnore` flags `@ts-ignore` only. The guide reluctantly allows `@ts-expect-error` in tests; `test/language-pack.types.ts` uses it.
- Acronyms as single words (`loadHttpUrl`, not `loadHTTPURL`), with a platform-name exception such as `XMLHttpRequest`. `strictCase` would also flag Node's `isTTY`, and it cannot exempt one name, so it stays off.
- Object-literal keys are `lowerCamelCase` unless an external contract says otherwise. Biome cannot attach that exception per key. Object literals may use `camelCase`, `CONSTANT_CASE`, or `snake_case`, so Config File keys, Environment Setting names, and OAuth fields keep their spelling. A new internal `snake_case` key is not flagged.
- File names are `snake_case` in the guide. This template's paths are kebab-case and are part of the documented layout, so they stay.
- Braces on every control-flow body, except an `if` that fits on one line. `useBlockStatements` has no one-line exception.
- `new Function(...)`, `import x = require(...)`, and the JSDoc rules (document public exports, third person, no redundant JSDoc types, `//` for implementation notes). No stable Biome rule matches them.

## Spec fidelity

- Behaviour that departs from a sentence in `docs/spec.md` or its issue needs an ADR in `docs/adr/` that names the sentence and the reason. Without that ADR, flag the departure as a violation, even when the PR body explains it.
- A spec sentence the code has outgrown gets updated in the same PR, so spec and code never disagree.

## Layering ([ADR-0002](docs/adr/0002-commands-build-result-output-renders.md))

- `src/commands/` parses arguments, runs the command's flow, and sets `ctx.result`. Final text/json output belongs to `src/output.ts`.
- Logic reused by two commands moves to `src/services/` or `src/settings/`.
- Each settings file (Config File, `.env`, Token State) is read and written only through its store in `src/settings/`; the store owns the broken-file `400` and the too-open warning, so callers never branch on load status.
- User-facing strings come from the Language Pack (`src/locales/`), including envelope messages.

## Template markers

- Code a new CLI would change carries `// CUSTOMIZE:`; Sample Action code a new CLI deletes carries `// SAMPLE:`. A Sample-only import or type in shared files carries the marker too.
- New markers get a row in the README's marker tables.

## Domain language

- Identifiers use `GLOSSARY.md` terms (`ClientCredentials`, `TokenState`, `Mood`), not synonyms.
