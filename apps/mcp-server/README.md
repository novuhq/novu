<div align="center">
  <a href="https://novu.co?utm_source=github" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img alt="Novu Logo" src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280"/>
  </picture>
  </a>
</div>

<br/>

<p align="center">
  <a href="https://www.producthunt.com/products/novu">
    <img src="https://img.shields.io/badge/Product%20Hunt-Golden%20Kitty%20Award%202023-yellow" alt="Product Hunt">
  </a>
  <a href="https://news.ycombinator.com/item?id=38419513"><img src="https://img.shields.io/badge/Hacker%20News-%231-%23FF6600" alt="Hacker News"></a>
  <a href="https://www.npmjs.com/package/@novu/js">
    <img src="https://img.shields.io/npm/dm/@novu/js" alt="npm downloads">
  </a>
</p>

<h1 align="center">Novu MCP Server</h1>

<div align="center">
The Model Context Protocol (MCP) server for Novu — bring AI assistants directly into your notification workflows. Manage subscribers, trigger workflows, inspect events, and tune preferences from any MCP-compatible client.
</div>

<p align="center">
  <br />
  <a href="https://github.novu.co?utm_campaign=gh_org_profile&utm_source=github" rel="dofollow"><strong>Visit our main GitHub Repository »</strong></a>
  <br />
</p>

## ✨ Features

A single MCP server that unlocks your entire Novu workspace for AI agents:

- **Agents** — create, list, inspect, update Novu agents, and hand off channel connect to the Novu CLI playbook
- **Conversations** — list agent threads and inspect activity timelines (messages, approvals, MCP connections)
- **Notifications** — fetch and filter events with full execution logs and delivery status
- **Subscribers** — search and manage recipients by email, phone, name, or ID
- **Workflows** — list, inspect, create, update, and trigger notification workflows
- **Preferences** — read and update subscriber channel preferences (email, SMS, in-app, push, chat)
- **Environments** — view environments and their configuration
- **Integrations** — manage provider integrations across channels
- **Auth & Identity** — `whoami` verifies your credential (OAuth or API key) and reports the active region

## 🚀 Quick Start

You don't need to host anything — the server is fully managed. Pick the endpoint
for your Novu Cloud region and point your MCP client at it:

| Region | Endpoint | Novu API |
| --- | --- | --- |
| US | `https://mcp.novu.co/` | `api.novu.co` |
| EU | `https://eu.mcp.novu.co/` | `eu.api.novu.co` |

Each host is a dedicated deployment pinned to its region — there is no `?region=`
query param anymore. (For backward compatibility, a `?region=` that doesn't match
the host's region returns a `400` pointing you at the correct endpoint.)

### Authentication

The server supports two ways to authenticate, and both work identically on either
regional endpoint:

**1. OAuth (recommended)** — No API key to copy/paste. When your MCP client first
connects, the server responds with a `401` and an OAuth discovery document
(`/.well-known/oauth-protected-resource`) that points the client at Novu's
authorization server (Clerk). Your client opens the Novu sign-in + consent screen,
you pick an organization, and the client receives an access token automatically.

Any MCP client that supports remote OAuth (Cursor, Claude, ChatGPT, Windsurf, …)
handles this flow for you — just add the server URL with no header.

> Note: the client must request the `user:org:read` scope (advertised in the
> discovery document) so the Novu API can resolve your organization. If your Novu
> account belongs to multiple organizations, you'll be asked to select one during
> consent.

**2. API key** — Provide your key from the [Novu Dashboard](https://dashboard.novu.co/api-keys) as a bearer token:

```text
Authorization: Bearer <your-novu-api-key>
```

When you present an API key, the server treats the session as API-key mode and
will **not** trigger the OAuth sign-in flow — even on the hosted endpoints. The
key is bound to a single environment (and thus region), so no extra configuration
is needed; just connect to the endpoint for the region your account lives in.

> **Self-hosted Novu?** OAuth is only available for **Novu Cloud** (US/EU) — the
> flow runs against Novu Cloud's authorization server, which a self-hosted
> deployment has no access to. Self-hosted deployments **always** authenticate
> with an API key. See [Deploying your own instance](#deploying-your-own-instance)
> and [Local Development](#-local-development).

## 🎯 Environments

How requests map to a Novu environment depends on how you authenticate:

- **API key** — the key itself is bound to a single environment; requests always
  run against that environment.
- **OAuth** — the token is bound to your **organization**, and the Novu API
  defaults to the **Development** environment.

For OAuth sessions, every tool accepts an optional `environmentId` parameter to
target a specific environment (forwarded to the Novu API as the
`Novu-Environment-Id` header). Call `get_environments` first to list your
environments, then pass the `_id` of the one you want — for example, to inspect
Production notifications. The Novu API validates that the environment belongs
to your organization. With an API key the parameter is ignored — the key
already pins the environment.

**Local / self-hosted API** — to point this MCP server at a Novu API running
elsewhere (for example a self-hosted instance on `http://localhost:3000`), set
`NOVU_API_URL` in `.dev.vars` and run the server locally (see
[Local Development](#-local-development)). This replaces the old `?region=local`
query param. Self-hosted always uses an API key — OAuth is Novu Cloud only.

## 🛠️ Usage

The server speaks the Streamable HTTP MCP transport at `https://mcp.novu.co/`
(US) and `https://eu.mcp.novu.co/` (EU).

### Cursor, Windsurf, Claude & other OAuth-capable clients

Any client that supports remote MCP servers with OAuth can connect with **no header** —
the client runs the sign-in flow for you:

- **URL (US):** `https://mcp.novu.co/`
- **URL (EU):** `https://eu.mcp.novu.co/`

On first connection the client opens the Novu sign-in + consent screen. Approve it,
select your organization, and the tools appear automatically.

### API key (mcp-remote / stdio clients, self-hosted Novu)

For clients that only support stdio transports, if you prefer a static API key,
or if you run a **self-hosted Novu** instance (where OAuth is not available),
use the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) proxy with an
`Authorization` header. Presenting an API key keeps the client from launching the
OAuth flow:

```json
{
  "mcpServers": {
    "novu": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.novu.co/",
        "--header",
        "Authorization:Bearer your-novu-api-key"
      ]
    }
  }
}
```

For the EU region, swap the URL for `https://eu.mcp.novu.co/`.

## 📦 Available Tools

| Tool | Description |
| ---- | ----------- |
| `whoami` | Show who is authenticated (verifies the credential against the Novu API) and the active region |
| `create_agent` | Create an agent (defaults to managed demo Claude; no API key needed) |
| `connect_agent` | Return CLI playbook instructions to connect a channel to an existing agent |
| `get_agents` | List agents with cursor pagination |
| `get_agent` | Retrieve a single agent by identifier |
| `update_agent` | Update an agent's name, status, bridge URL, or behavior |
| `get_conversations` | List agent conversations with optional filters (agent, subscriber, status, provider) |
| `get_conversation_activities` | Inspect a conversation timeline (compact debug digest; `verbose` for raw JSON) |
| `get_environments` | List all environments with their details and API keys |
| `get_notifications` | Fetch events with filtering by channel, template, subscriber, date, and more |
| `get_notification` | Get a specific notification with detailed execution logs |
| `find_subscribers` | Search subscribers by email, name, phone, or ID |
| `get_subscriber_preferences` | Get a subscriber's preferences across all channels and workflows |
| `update_subscriber_preferences` | Update a subscriber's channel preferences globally or per workflow |
| `get_workflows` | List all workflows with their basic information |
| `get_workflow` | Get a workflow's full definition, steps, and payload schema |
| `trigger_workflow` | Trigger a workflow for a subscriber with a custom payload |
| `get_integrations` | List configured provider integrations across channels |

## 💻 Local Development

**Prerequisites:** [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/installation).

```bash
# Clone and install
git clone https://github.com/novuhq/novu-mcp-server.git
cd novu-mcp-server
pnpm install

# Start the local worker
pnpm dev
```

The server runs at [http://localhost:8787](http://localhost:8787). Point your MCP client at it the same way you would the hosted version:

```json
{
  "mcpServers": {
    "novu": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/",
        "--header",
        "Authorization:Bearer your-novu-api-key"
      ]
    }
  }
}
```

Configuration is read from `.dev.vars` (gitignored) — copy
[`.dev.vars.example`](.dev.vars.example) to get started. The key variables are:

- `NOVU_API_URL` — the Novu API this server proxies to (e.g. `http://localhost:3000`
  for a self-hosted API, or `https://api.novu.co` / `https://eu.api.novu.co` for cloud).
- `NOVU_REGION` — the display label surfaced by `whoami`.
- `CLERK_OAUTH_ISSUER` — the Clerk authorization server for OAuth. Leave empty to
  disable OAuth entirely and run API-key-only (the self-hosted mode).

For local development against a **self-hosted Novu API** on `http://localhost:3000`,
set `NOVU_API_URL="http://localhost:3000"` in `.dev.vars` and use your instance's
API key (OAuth is Novu Cloud only):

```json
{
  "mcpServers": {
    "novu-local": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/",
        "--header",
        "Authorization:Bearer your-local-novu-api-key"
      ]
    }
  }
}
```

### OAuth in local development

To exercise OAuth locally, set `CLERK_OAUTH_ISSUER` in `.dev.vars` to a Clerk
authorization server your Novu API trusts (e.g. `https://clerk.dashboard.novu.co`
for US). The MCP endpoint origin is derived from the request URL, so run the dev
server and point your MCP client at the same URL (e.g. `http://localhost:8787/`).
RFC 9728 requires the PRM `resource` field to exactly match the MCP endpoint URL;
connecting via a different host/port than the server is bound to causes clients
like Cursor to discard the metadata and register without the `user:org:read` scope.

When `CLERK_OAUTH_ISSUER` is empty, the OAuth discovery endpoints return `404` and
`401` responses omit the OAuth metadata, so clients fall back to API-key auth.

### Deploying your own instance

The server is a standard Cloudflare Worker. `wrangler.jsonc` is organized so the
**top-level config is local-dev-only** (no `routes`, so `wrangler dev` serves on
localhost and OAuth discovery advertises the localhost origin), while real
deployments live under named environments:

- `pnpm deploy` → `--env us` (binds `mcp.novu.co`, `NOVU_API_URL=https://api.novu.co`)
- `pnpm deploy:eu` → `--env eu` (binds `eu.mcp.novu.co`, `NOVU_API_URL=https://eu.api.novu.co`)

To deploy your own instance, fork the repo and add an environment under `env`
(or edit an existing one) with your own `routes`, `NOVU_API_URL`, and
`NOVU_REGION`, then deploy it with `wrangler deploy --env <name>`. A self-deployed
instance works out of the box with API-key authentication against whatever
`NOVU_API_URL` points at — including a self-hosted Novu API. OAuth on your own
deployment requires setting the `CLERK_OAUTH_ISSUER` secret
(`wrangler secret put CLERK_OAUTH_ISSUER --env <name>`) to an authorization
server that your Novu API trusts; leave it unset for API-key-only.

### Scripts

- `pnpm dev` — Run the worker locally via Wrangler (top-level, route-free config)
- `pnpm deploy` — Deploy the US worker (`mcp.novu.co`, `--env us`)
- `pnpm deploy:eu` — Deploy the EU worker (`eu.mcp.novu.co`, `--env eu`)
- `pnpm type-check` — Run TypeScript type checking
- `pnpm lint:fix` — Fix linter issues with Biome
- `pnpm format` — Format the codebase with Biome

### Project structure

```text
src/
├── index.ts            # Worker entry — auth extraction and routing
├── oauth.ts            # OAuth discovery, 401 bootstrap, initialize-time probe
├── server/NovuMCP.ts   # Durable Object hosting the MCP agent
├── tools/              # One file per tool group (workflows, subscribers, …)
├── utils/              # API client, validation, tool factory
└── types/              # Shared TypeScript types
```

Add new tools by creating a `register*Tools` function under `src/tools/` and wiring it in `src/server/NovuMCP.ts`.

## 🔒 Security

- The server is a **pure OAuth pass-through**: it does not mint, exchange, or
  re-sign tokens. It never validates tokens itself — it advertises Novu's Clerk
  authorization server and forwards the caller's `Authorization` header verbatim
  to the Novu API, which validates it and resolves the org/permissions.
- OAuth access tokens (Clerk opaque `oat_…` tokens) are short-lived and revocable
  from the Novu side, so they are far safer than a long-lived API key.
- Whether OAuth token or legacy API key, the credential is scoped to your MCP
  session: it is handed to the session's Durable Object via the runtime's props
  channel — never placed in URLs, where it would leak into request logs — and is
  discarded with the session. The server holds no ambient credentials.
- Never commit API keys or issuer config. Use `.dev.vars` for local values
  (already gitignored).
- Treat your Novu API key like a password — rotate it from the dashboard if you
  suspect it has been exposed.

## 🤝 Contributing

1. **Make Changes**

   ```bash
   git checkout -b feat/your-change
   pnpm dev           # Test locally
   pnpm type-check    # Verify types
   git commit -m "feat: your change"
   git push origin feat/your-change
   ```

2. **Open a Pull Request**
   - Use a descriptive title with `feat:`, `fix:`, `docs:`, or `chore:` prefix
   - Include a short description of the change and, where relevant, a sample tool call

**Guidelines:**

- Keep tool descriptions concise — they are surfaced verbatim to LLMs
- Validate inputs with Zod schemas in `src/utils/`
- Prefer the `ToolFactory` helpers for standard CRUD endpoints
- Something missing? Open a [GitHub issue](https://github.com/novuhq/novu-mcp-server/issues)

**Need help?** Email us at [support@novu.co](mailto:support@novu.co) or join the [Discord](https://discord.novu.co).

---

Thank you for contributing! 🙏
