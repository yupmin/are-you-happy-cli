---
name: are-you-happy-cli
description: Ask how someone feels (their Mood) through the are-you-happy-cli command-line tool. Use when the user asks how a person is feeling, whether someone is happy, or for someone's mood via are-you-happy-cli, or when setting up / troubleshooting that CLI (config, Client Credentials, Access Token).
---

# are-you-happy-cli

A sample CLI that asks a virtual API for a person's **Mood** (`happy`, `sad`, `angry`, `excited`, `tired`).

## Invocation

```sh
npx are-you-happy-cli action <command> --format json   # actions: parse the JSON envelope
npx are-you-happy-cli config|auth <command>              # setup: text only, judge by exit code
```

- Every `action` call MUST pass `--format json`. Parse only that JSON envelope.
- `config` and `auth` commands have no `--format` (passing it is a usage error, exit 2). They print text for people: the result on stdout, warnings and errors on stderr. Decide success or failure from the exit code, and relay stderr warnings to the user.
- Run from the user's project directory: Client Credentials are read from the `.env` in the current directory only (no parent lookup).

## Output contract (`action --format json`)

- stdout carries exactly one JSON envelope.
- Success: `{ "code": number, "message": string, "data": object }`. There is no `reason`. `data` is the payload plus `warnings`.
- Failure: `{ "code": number, "message": string, "reason": string, "data": { "warnings": string[] } }`. `data` is not null.
- `code` is HTTP-style (`200`, `400`, `401`, `403`, `500`).
- `reason` is the same in every language. Switch on `reason`, not on the words in `message`.
- `message` is localized. On failure it includes a hint on what to do next.
- Warnings (overwrites, loose file permissions, token refresh, unsupported language fallback) are `data.warnings` on success and on failure. Relay relevant ones to the user.
- Timestamps are ISO 8601 with the configured time zone offset.
- `config` and `auth` are text, so they have no `reason`. Judge those by exit code and relay stderr.

Exit codes (every command):

| Exit | Meaning |
|---|---|
| 0 | success (2xx) |
| 2 | `code` 400 — bad input, missing/invalid Config File |
| 3 | `code` 401 / 403 — credentials or token problem |
| 1 | anything else; `500` is a bug — rerun once with `--verbose` to get the stack trace on stderr, then report it |
| 130 | user interrupted (Ctrl+C) — stop, do not retry |

## Commands

| Command | Notes |
|---|---|
| `config init --lang <en\|ko> --timezone <IANA>` | Creates the Config File. Non-interactive when both flags are given. Overwrites with a warning. |
| `config show` | Effective settings and where each came from, one `KEY = value (source)` line each. Secrets are masked. |
| `auth client` | **Interactive only. You cannot run it.** Registers Client Credentials into `./.env`. |
| `auth issue-token` | Issues an Access Token from the Client Credentials and saves the Token State. |
| `auth purge-token` | Deletes the Token State. |
| `action are-you <name>` | Returns `data: { name, mood, message, checkedAt }`. `mood` ∈ `happy\|sad\|angry\|excited\|tired`. `message` is localized (en/ko). |

`action are-you` issues an Access Token automatically when there is no Token State (and reuses it until it expires), refreshes an expired one, and reissues the token when the Client ID in `.env` changed since issue. Each case shows up in `data.warnings`; no action needed.

## Recovery

Switch on `reason` from an `action --format json` failure. Apply at most one recovery step, then retry the original command once. Never loop retries. Do not match English or Korean sentences in `message`.

| `reason` | Do |
|---|---|
| `config_missing` | Run `config init --lang <lang> --timezone <zone>` (exit 0 = done). If language/time zone are unknown, ask the user, or use `en` and their system time zone. |
| `config_invalid` | Same as `config_missing` (recreates the Config File). |
| `token_invalid` | Run `auth issue-token` once, then retry. |
| `no_credentials` | Ask the user to run `! npx are-you-happy-cli auth client` themselves in the prompt, then retry. |
| `credentials_rejected` | The Client ID or Secret was rejected. Ask the user to run `auth client` again. Do not retry `auth issue-token` against the same `.env`. |
| `token_rejected` | Run `auth issue-token` once, then retry. If it still fails, stop and tell the user. |
| `unexpected` | Rerun once with `--verbose`, report the stack trace to the user. |
| `usage` | The invocation is wrong. Fix the arguments. Do not retry the same command line. |
| `unsupported_lang` | Pass `--lang en` or `--lang ko`. |
| `invalid_timezone` | Pass a valid IANA `--timezone`. |
| `dotenv_invalid` | The cwd `.env` could not be parsed. Ask the user to fix that file. |
| `interactive_only` | The user must run `auth client` in a terminal. You cannot run it. |
| `noninteractive` | Re-run `config init` with both `--lang` and `--timezone`. |

Never ask the user to paste the Client Secret (or any token) into chat. Credentials go in only via `auth client`, typed by the user.

## Example

```sh
npx are-you-happy-cli action are-you Minsu --format json
```

```json
{
  "code": 200,
  "message": "Minsu is happy.",
  "data": {
    "name": "Minsu",
    "mood": "happy",
    "message": "Minsu is happy.",
    "checkedAt": "2026-11-22T23:10:00+09:00",
    "warnings": []
  }
}
```

Failure (any language):

```json
{
  "code": 400,
  "message": "No Config File found. Run `are-you-happy-cli config init` first.",
  "reason": "config_missing",
  "data": { "warnings": [] }
}
```
