# Coding Standards

Read during code review. Rules here are judgement calls; anything mechanical lives in `biome.json`, `tsconfig.json`, or the pre-commit hook instead.

## Spec fidelity

- Behaviour that departs from a sentence in `docs/spec.md` or its issue needs an ADR in `docs/adr/` that names the sentence and the reason. Without that ADR, flag the departure as a violation, even when the PR body explains it.
- A spec sentence the code has outgrown gets updated in the same PR, so spec and code never disagree.

## Layering ([ADR-0002](docs/adr/0002-commands-build-result-output-renders.md))

- `src/commands/` parses arguments, runs the command's flow, and sets `ctx.result`. Final text/json output belongs to `src/output.ts`.
- Logic reused by two commands moves to `src/services/` or `src/settings/`.
- User-facing strings come from the Language Pack (`src/locales/`), including envelope messages.

## Template markers

- Code a new CLI would change carries `// CUSTOMIZE:`; Sample Action code a new CLI deletes carries `// SAMPLE:`. A Sample-only import or type in shared files carries the marker too.
- New markers get a row in the README's marker tables.

## Domain language

- Identifiers use `GLOSSARY.md` terms (`ClientCredentials`, `TokenState`, `Mood`), not synonyms.
