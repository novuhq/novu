# Novu Agent Onboarding — instructions for an AI agent

You are an AI coding agent helping a user create their first **Novu managed agent** and connect it to **Slack**, with **no Novu account required up front** (keyless mode). You will gather a couple of inputs, infer the agent's purpose from the user's project, run one non‑interactive CLI command, hand the user a Slack authorization link, and then explain how they keep the agent by signing up.

Do not wire Novu into the user's codebase. This flow only creates a hosted agent and connects a channel.

---

## What you will do (overview)

1. Collect inputs from the user (Slack config token; optionally a Claude key).
2. Infer the agent's purpose from the project and confirm it with the user.
3. Run `novu connect` non‑interactively (keyless, Slack).
4. Watch the output, surface the Slack authorize URL to the user immediately.
5. Report success and explain the demo limit → sign‑up/claim.

---

## Prerequisites (one‑time)

This is the pre‑npm flow, so you invoke the CLI by its **full path** from the built output.

1. Build the CLI from the repo root:

```bash
pnpm --filter novu build
```

2. Resolve the absolute repo root (the directory that contains `packages/novu`) and set the entry path you will use for every command below:

```bash
NOVU_REPO=~/projects/novu
NOVU_CLI="$NOVU_REPO/packages/novu/dist/src/index.js"
```

> Assume the Novu API/stack is already running and configured for keyless. This guide targets the local stack via `--region local`. When the CLI ships to npm, every `node "$NOVU_CLI" connect …` below becomes simply `npx novu connect …`.

---

## Step 1 — Collect inputs from the user

Ask the user for:

- **Slack App Configuration Token** (`xoxe.xoxp-…`) — **required**. The CLI uses it once to create the Slack app from a manifest; it is never stored. The user generates it at <https://api.slack.com/apps> under **"Your App Configuration Tokens"** (see <https://api.slack.com/authentication/config-tokens>). Tell them to copy the **access token** (`xoxe.xoxp-…`); it is short‑lived (~12h), so use it promptly.
- **(Optional) Their own Claude/Anthropic key** — only if they don't want the shared demo runtime. If they provide `sk-ant-…`, you'll pass BYOK flags (see Step 3). Otherwise the default **demo runtime** is used (no key needed).

Do **not** ask them for the agent name/description — you will infer it next.

---

## Step 2 — Infer the agent's purpose from the project

Read the project to decide what this agent should *do* for the user:

- `README.md`, `package.json` (name/description/keywords), and the app's primary source (routes, domain models, product copy).

From that, draft a concise **1–2 sentence agent description** of the assistant the user likely wants — e.g. _"A support agent for <product> that answers questions about <domain> and can <key action>."_ This string becomes the agent prompt; the server expands it into a system prompt, tools and skills.

Show the drafted description to the user, let them edit it, and **get explicit confirmation** before running anything.

---

## Step 3 — Run `novu connect` (keyless, Slack, non‑interactive)

Run the command **streamed / in the background** so you can read its output live (Step 4 depends on this). Keyless is the default — do **not** pass `--secret-key`.

```bash
node "$NOVU_CLI" connect "<CONFIRMED AGENT DESCRIPTION>" \
  --ci \
  --region local \
  --channel slack \
  --slack-config-token "<xoxe.xoxp-...>"
```

- `--ci` forces non‑interactive mode (no prompts, no TUI).
- The positional description is **required** in non‑interactive mode.
- Default runtime is the **demo** Claude runtime (no key). For **BYOK**, append:

```bash
  --runtime claude --anthropic-api-key "sk-ant-..."
```

---

## Step 4 — Hand off Slack authorization (human‑in‑the‑loop)

Slack OAuth cannot be automated — a human must approve the install. The CLI creates the Slack app, prints an authorize URL, then **polls for up to 5 minutes**.

- Watch stdout for the line:

  ```
  → Authorize Slack here: <url>
  ```

- The moment it appears, **give the user that URL** and ask them to open it and approve the Slack install **within 5 minutes**.
- The command finishes on its own once they authorize. If it times out (~5 min) it exits with an error — just **re‑run the exact same command**; it reuses the Slack app it already created.

---

## Step 5 — Report the result

On success the CLI exits `0` and prints:

```
✓ Your agent is live.
  Agent: <name> (<identifier>)
  → Check Slack — your agent just messaged you.
  Dashboard: <dashboard url>
```

Extract the **agent identifier** and **Dashboard URL** and tell the user:

- Their agent is live — open Slack and message it (the agent already said hello).
- **Keyless demo limit:** they get a handful of free replies (about 5). After that, the agent posts a **"Sign up & keep this agent"** link in the channel. Clicking it creates their Novu account and **migrates the agent, the Slack connection, and the whole conversation** into their new workspace's Development environment — and the agent picks the conversation back up right where it left off.

On failure (non‑zero exit, or a line starting with `✗`), surface the error message and the matching fix:

| Symptom | Fix |
|---|---|
| `…requires --prompt "<agent description>"` | You didn't pass the positional description — re‑run Step 3 with it. |
| `…--slack-config-token "xoxe.xoxp-…"` | Ask the user for the Slack App Configuration Token (Step 1) and pass it. |
| `Slack OAuth was not completed within … seconds` | The user didn't approve in time — re‑run the same command (the Slack app is reused). |
| `Keyless environment creation is currently disabled` / no demo integration | The target API isn't configured for keyless/demo — confirm you're pointing at the right `--region`/`--api-url`, or have the user provide `--secret-key` for their existing account instead. |
| `credential input required …` | A BYOK runtime was selected without a key — pass `--anthropic-api-key` (or use the default demo runtime). |

---

## Command flag reference (the subset this flow uses)

| Flag | Purpose |
|---|---|
| `connect "<description>"` | Positional agent description (required in `--ci`). |
| `--ci` | Non‑interactive mode. |
| `--region local` | Target the local stack (drop / change for other environments). |
| `--channel slack` | Connect Slack (the only channel this guide covers). |
| `--slack-config-token <xoxe.xoxp-…>` | Create the Slack app headlessly. |
| `--runtime claude --anthropic-api-key <sk-ant-…>` | Optional BYOK Claude runtime (default is the shared demo runtime). |
| `--secret-key <key>` | Optional — use an existing Novu account instead of keyless. |

---

## Limitations to keep in mind

- **One run = one new agent + one channel.** Re‑running `connect` creates another agent; there's no "add a channel to the existing agent" in this non‑interactive flow yet.
- **Slack only** for now. Email is planned; **Telegram is interactive‑only** (QR scans) and **WhatsApp/Teams** only open the dashboard — none of these work headlessly today.
- Keyless data is temporary until the user claims it via the in‑channel sign‑up link.
