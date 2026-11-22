---
name: are-you-happy-cli
description: Ask how someone feels (their Mood) through the are-you-happy-cli command-line tool. Use when the user asks how a person is feeling, whether someone is happy, or for someone's mood via are-you-happy-cli, or when setting up / troubleshooting that CLI (config, Client Credentials, Access Token).
---

# are-you-happy-cli

A sample CLI that asks a virtual API for a person's **Mood** (`happy`, `sad`, `angry`, `excited`, `tired`).

## Invocation

Always run:

```sh
npx are-you-happy-cli <command> --format json
```

- Every call MUST pass `--format json`. Never parse text output.
- Run from the user's project directory: Client Credentials are read from the `.env` in the current directory only (no parent lookup).

## Output contract

- stdout carries exactly one JSON envelope: `{ "code": number, "message": string, "data": object | null }`.
- `code` is HTTP-style (`200`, `400`, `401`, `403`, `500`).
- On failure `data` is `null` and `message` includes a hint on what to do next.
- Warnings (overwrites, loose file permissions, token refresh, unsupported language fallback) appear in `data.warnings`. Relay relevant ones to the user.
- Timestamps are ISO 8601 with the configured time zone offset.

Exit codes:

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
| `config show` | Effective settings and where each came from. Secrets are masked. |
| `auth client` | **Interactive only. You cannot run it.** Registers Client Credentials into `./.env`. |
| `auth issue-token` | Issues an Access Token from the Client Credentials and saves the Token State. |
| `auth purge-token` | Deletes the Token State. |
| `action are-you <name>` | Returns `data: { name, mood, message, checkedAt }`. `mood` ∈ `happy\|sad\|angry\|excited\|tired`. `message` is localized (en/ko). |

`action are-you` issues an Access Token automatically when there is no Token State (and reuses it until it expires), refreshes an expired one, and reissues the token when the Client ID in `.env` changed since issue. Each case shows up in `data.warnings`; no action needed.

## Recovery

Apply at most one recovery step per failure, then retry the original command once. Never loop retries.

| Situation | Do |
|---|---|
| `400` and `message` mentions `config init` (no Config File) | Run `config init --lang <lang> --timezone <zone> --format json`. If language/time zone are unknown, ask the user, or use `en` and their system time zone. |
| `400` "Config File is not valid" | Same as above (recreates it). |
| `400` "Token State is not valid" | Run `auth issue-token --format json` once, then retry. |
| `401` and `message` mentions `auth client` (no Client Credentials) | Ask the user to run `! npx are-you-happy-cli auth client` themselves in the prompt, then retry. |
| `401` otherwise (token rejected) | Run `auth issue-token --format json` once, then retry. If it still fails, stop and tell the user. |
| `500` | Rerun once with `--verbose`, report the stack trace to the user. |

Never ask the user to paste the Client Secret (or any token) into chat. Credentials go in only via `auth client`, typed by the user.

## Example

```sh
npx are-you-happy-cli action are-you Minsu --format json
```

```json
{
  "code": 200,
  "message": "Minsu is happy.",
  "data": { "name": "Minsu", "mood": "happy", "message": "Minsu is happy.", "checkedAt": "2026-11-22T23:10:00+09:00" }
}
```
