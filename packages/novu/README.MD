<div align="center">
  <a href="https://novu.co?utm_source=github" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img alt="Novu Logo" src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280"/>
  </picture>
  </a>
</div>

# Novu CLI

[![Version](https://img.shields.io/npm/v/novu.svg)](https://www.npmjs.org/package/novu)
[![Downloads](https://img.shields.io/npm/dm/novu.svg)](https://www.npmjs.com/package/novu)

The Novu CLI connects AI agents to real communication channels — Slack, Email, Telegram, WhatsApp, and Microsoft Teams — without wiring each provider yourself.

Describe what your agent should do, pick a channel, and Novu provisions credentials, identity, and delivery so your agent can message users where they already are.

Learn more in the [managed agent quickstart](https://docs.novu.co/agents/managed-agent/quickstart).

## Quickstart

```bash
npx novu@latest connect
```

The interactive flow:

1. **Choose a runtime** — demo credentials (fastest), Claude managed agents, AWS Claude, or a self-hosted bridge (`ai-sdk`, `langchain`, `custom-code`, `chat-sdk`).
2. **Describe your agent** — Novu generates the system prompt, tools, MCP servers, and skills from your description.
3. **Pick a channel** — Slack, Email, Telegram, WhatsApp, Microsoft Teams, or skip for now.
4. **Finish the handoff** — the CLI guides you through the last step (Slack OAuth, send a test email, BotFather token, etc.).

When the run succeeds, your agent is live on the connected channel. Re-run `npx novu connect` to add another channel or create another agent.

### Keyless try-before-sign-up

Try Novu without an account:

```bash
npx novu@latest connect "A support assistant for Acme's customers that answers billing questions." \
  --keyless \
  --channel slack
```

Keyless creates a temporary demo agent (~5 free replies). Claim it via the in-channel sign-up link to move the agent into your workspace.

### Connect a self-hosted Chat SDK agent

If your agent runs in your codebase with the [Chat SDK adapter](https://www.npmjs.com/package/@novu/chat-sdk-adapter):

```bash
npx novu@latest connect --runtime chat-sdk
```

The CLI authenticates your Novu account, creates a bridge agent, writes `NOVU_SECRET_KEY` and `NOVU_AGENT_IDENTIFIER` to your env, and opens the channel picker.

## Channels

| Channel | What the CLI sets up |
| --- | --- |
| **Slack** | Creates the Slack app, stores OAuth credentials, opens the install flow |
| **Email** | Provisions a unique inbound address (e.g. `my-agent@agentconnect.sh`) |
| **Telegram** | Links your @BotFather bot token |
| **WhatsApp** | Hands off to the Novu dashboard to finish provider setup |
| **Microsoft Teams** | Hands off to the Novu dashboard to finish provider setup |

One `connect` run creates one agent and connects one channel. Run it again to add more channels (each run creates a new agent unless you pick an existing one).

## Authentication

| Mode | When to use | How |
| --- | --- | --- |
| **Dashboard OAuth** (default) | You have or want a Novu account | Omit `--keyless` and `--secret-key`; approve in the browser |
| **Keyless** | Try Novu without signing up | Pass `--keyless` |
| **Secret key** | CI or existing automation | Pass `--secret-key` or set `NOVU_SECRET_KEY` |

WhatsApp and Microsoft Teams require dashboard OAuth — they are not supported with `--keyless` in non-interactive mode.

## CLI commands

| Command | Description |
| --- | --- |
| `connect` | Create a managed or bridge agent and connect it to a channel |
| `init` | Scaffold a new Novu app (`notifications`, `agent`, or `chat-sdk` template) |
| `sync` | Sync bridge workflow state with Novu Cloud |
| `dev` | Start local Novu Studio and a tunnel to your bridge app |
| `translations pull` | Pull translation files from Novu Cloud |
| `translations push` | Push translation files to Novu Cloud |
| `step publish` | Bundle and deploy step handlers to Novu |

Run `npx novu@latest <command> --help` for full flags and examples.

### `connect`

Create a managed agent and connect it to a channel.

```bash
# Interactive (recommended)
npx novu@latest connect

# Non-interactive / CI
npx novu@latest connect "An onboarding assistant for Acme's new members." \
  --ci \
  --channel email

# Keyless Slack
npx novu@latest connect "A support assistant for Acme's customers." \
  --ci \
  --keyless \
  --channel slack

# Chat SDK bridge (no prompt required)
npx novu@latest connect \
  --runtime chat-sdk \
  --secret-key "$NOVU_SECRET_KEY" \
  --channel telegram
```

**Runtimes:** `demo` (default), `claude`, `claude-aws`, `ai-sdk`, `langchain`, `custom-code`, `chat-sdk`

**Channels:** `slack`, `email`, `telegram`, `whatsapp`, `teams`, `skip`

**Common flags:**

| Flag | Description |
| --- | --- |
| `--ci` | Non-interactive mode (requires prompt and `--channel`) |
| `--keyless` | Temporary demo agent; claim via in-channel sign-up |
| `--secret-key <key>` | Use an existing Novu account |
| `--region <us\|eu>` | Target Novu Cloud region (default: `us`) |
| `--runtime <mode>` | Agent runtime or bridge mode |
| `--channel <name>` | Channel to connect |
| `--slack-config-token <token>` | CI escape hatch for Slack (prefer the secure setup page) |
| `--telegram-bot-token <token>` | CI escape hatch for Telegram (prefer the secure setup page) |

For the full non-interactive contract, machine-readable stdout markers, and AI-agent onboarding guide, see [`packages/shared/docs/agent-onboarding.md`](../shared/docs/agent-onboarding.md) or run `npx novu@latest connect --help`.

### `init`

Scaffold a new Novu application.

```bash
npx novu@latest init
npx novu@latest init --template chat-sdk
npx novu@latest init --template agent --agent-identifier my-agent
```

| Flag | Description |
| --- | --- |
| `-s, --secret-key <key>` | Novu development environment secret key |
| `-a, --api-url <url>` | Novu Cloud API URL (default: `https://api.novu.co`) |
| `-t, --template <name>` | Template: `notifications`, `agent`, or `chat-sdk` |
| `--agent-identifier <id>` | Agent identifier for the scaffolded template |

### `sync`

Sync your bridge endpoint state with Novu Cloud.

```bash
npx novu@latest sync -b https://acme.org/api/novu -s "$NOVU_SECRET_KEY"
npx novu@latest sync -b https://acme.org/api/novu -s "$NOVU_SECRET_KEY" -a https://eu.api.novu.co
```

| Flag | Description |
| --- | --- |
| `-b, --bridge-url <url>` | Bridge endpoint URL (required) |
| `-s, --secret-key <key>` | Novu secret key (required) |
| `-a, --api-url <url>` | Novu Cloud API URL (default: `https://api.novu.co`) |

### `translations`

Manage Novu translation files.

```bash
npx novu@latest translations pull -s "$NOVU_SECRET_KEY" -d ./translations
npx novu@latest translations push -s "$NOVU_SECRET_KEY" -d ./translations
```

| Flag | Description |
| --- | --- |
| `-s, --secret-key <key>` | Novu secret key |
| `-a, --api-url <url>` | Novu Cloud API URL |
| `-d, --directory <path>` | Local translations directory (default: `./translations`) |

### `step publish`

Bundle and deploy step handlers to Novu.

```bash
npx novu@latest step publish -s "$NOVU_SECRET_KEY"
npx novu@latest step publish -s "$NOVU_SECRET_KEY" --workflow my-workflow --dry-run
```

| Flag | Description |
| --- | --- |
| `-s, --secret-key <key>` | Novu API secret key |
| `-a, --api-url <url>` | Novu API URL |
| `-c, --config <path>` | Path to config file |
| `--out <path>` | Directory containing step handlers |
| `--workflow <id...>` | Deploy only specific workflows |
| `--step <id...>` | Deploy only specific steps (requires `--workflow`) |
| `--template <path>` | React Email template path |
| `--dry-run` | Bundle without deploying |

## Local Novu Studio

Use `dev` when you are building code-first notification workflows with [`@novu/framework`](../framework) and want a local Studio + tunnel to your bridge app.

```bash
npx novu@latest dev
```

| Flag | Long form | Description | Default |
| --- | --- | --- | --- |
| `-p` | `--port <port>` | Bridge application port | `4000` |
| `-r` | `--route <route>` | Bridge application route | `/api/novu` |
| `-o` | `--origin <origin>` | Bridge application origin | `http://localhost` |
| `-d` | `--dashboard-url <url>` | Novu Cloud dashboard URL | `https://dashboard.novu.co` |
| `-sp` | `--studio-port <port>` | Local Studio server port | `2022` |
| `-sh` | `--studio-host <host>` | Local Studio server host | `localhost` |
| `-t` | `--tunnel <url>` | Self-hosted tunnel URL | — |
| `-H` | `--headless` | Run bridge in headless mode | `false` |
| | `--no-studio` | Skip starting local Studio | — |
| | `--run <command>` | Spawn a local app server before opening the tunnel | — |

Example — bridge on port `3002` with an EU dashboard:

```bash
npx novu@latest dev --port 3002 --dashboard-url https://eu.dashboard.novu.co
```

## Links

- [Managed agent docs](https://docs.novu.co/agents/managed-agent/quickstart)
- [Agent onboarding guide for AI assistants](../shared/docs/agent-onboarding.md)
- [Novu documentation](https://docs.novu.co)
- [Discord community](https://discord.novu.co)
- [Report a bug](https://github.com/novuhq/novu/issues/new?assignees=&labels=type%3A+bug&template=bug_report.yml&title=%F0%9F%90%9B+Bug+Report%3A+)
- [Request a feature](https://github.com/novuhq/novu/issues/new?assignees=&labels=feature&template=feature_request.yml&title=%F0%9F%9A%80+Feature%3A+)
