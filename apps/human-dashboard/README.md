# @novu/human-dashboard

Next.js app for [agentinbox.md](https://agentinbox.md). It serves the invite page for
[`@agentinbox/cli`](../../packages/agentinbox) and Human accounts (proof of concept, NV-8909); the agentinbox.md
landing page moves in here later.

| Route             | What it is                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `/invite/[token]` | Page opened from a `human invite` link. The person connects Telegram or Slack and picks their default app. |
| `/connect`        | Page opened from `channel add telegram` or `channel add slack` when credentials are pasted in the browser. The setup token stays in the URL fragment. |
| `/sign-up`, `/sign-in` | Human accounts, signed in with the Human Clerk app (not the Novu dashboard's).         |
| `/claim`          | Opened from the link an agent gets when its keyless setup runs out of free messages. Moves that setup into the operator's Human account. |
| `/cli/login`      | Opened by `human login`. The operator types the code their terminal shows, and that CLI gets the account's key; a keyless setup on that computer moves into the account on the way. |
| `/onboarding`     | Where a new operator lands after signing up: four steps (Address, Test, Connect, Reach) that make the agent and connect it to a host. One address; the step comes from how far the setup got. |
| `/inbox`, `/configure`, `/contacts` | The dashboard: the agent's inbox, the agent with its channels, and the people it can ask. An operator without an agent is sent to `/onboarding`. |
| `/settings`, `/settings/billing` | The operator, their API key (show, copy, regenerate), the plan and billing, log out and delete account. |
| `/`               | Placeholder until the landing page moves in.                                               |
| `/api/*`          | The Agent Inbox API, which forwards to the Novu API, so people only ever see this site's address. See [Agent Inbox API](#agent-inbox-api). |

Each Human account is backed by a hidden Novu organization that the Novu API creates through private
`/v1/human/accounts` endpoints. See
[the ADR](../../packages/agentinbox/docs/adr/0001-separate-clerk-app-with-backing-organizations.md) and the
[Agent Inbox glossary](../../packages/agentinbox/CONTEXT.md).

## Onboarding

An operator gets an agent in one of two ways, and both end in the dashboard:

- **Sign-up in the dashboard.** `/onboarding` walks them through the four steps. "Later" on step 2 and
  the connector link on step 3 open the dashboard early; banners on Inbox and Configure lead back to the
  step that was left.
- **Claim from the CLI.** The agent was made in a terminal and comes with the claim (`/claim`, or
  `/cli/login` with a setup to keep). It has its address and its host, so its operator skips the steps.

How far an operator got is kept in the private metadata of their Clerk user (`lib/onboarding-state.ts`).
An agent that is older than its operator's first visit to step 1 never goes through the steps: it was in
use before, however the operator came to see that step.

## Develop

```sh
cp apps/human-dashboard/.env.example apps/human-dashboard/.env.local
pnpm start:human-dashboard         # http://localhost:4300
```

The invite page calls the public `/v1/invites/*` endpoints of this site's Agent Inbox API (`/api`). Run the
API locally (`pnpm start:api:dev`) with `HUMAN_DASHBOARD_URL=http://localhost:4300` so `human invite` links point
here, then run `human invite <id>` against the local API and open the printed link.

Human accounts also need:

- a Clerk application for Human (development instance is fine), with its keys in `.env.local`;
- `AGENT_INBOX_DASHBOARD_API_SECRET` here, with the same value as `AGENT_INBOX_DASHBOARD_API_SECRET` in the API's `.env`;
- an API running with the Clerk-backed enterprise auth and keyless enabled;
- if Novu's Clerk instance has an allowlist (the development one does), `*@users.agentinbox.md` on it. The
  hidden Novu users get made-up addresses there, and otherwise Clerk refuses them with `not_allowed_access`.

To try a claim, set `KEYLESS_HUMAN_INTERACTION_CAP=1` on the API, run `human setup` without a key against
the local API, send two messages, and open the printed `/claim` link.

To try `login`, point the CLI at this site's `/api` (`INBOX_API_URL=http://localhost:4300/api`), run `login` and enter
the code it prints on `/cli/login` here. The API only offers the browser login when `HUMAN_DASHBOARD_URL` is set.

## Agent Inbox API

`/api` is Agent Inbox's API: each of its paths forwards to one on the US Novu API (`NEXT_PUBLIC_NOVU_API_URL`), such
as `/api/v1/inbox` to `/v1/human/inbox`, and the API's status, headers and body come back as they are
(`src/app/api/[...path]/route.ts`; the paths are `ROUTES` in `src/lib/api-proxy.ts`, grouped like the CLI's
commands). The CLI goes to `https://www.agentinbox.md/api` by default, the MCP server calls it for every tool, the
invite, verify and connect pages call `/api` from the browser, and the setup prompts name this site's `/api`. The CLI
and the MCP server only speak these paths, so a self-hosted or local setup points them at its own dashboard's `/api`.

- Only those paths are forwarded; anything else answers 404. The private `/v1/human/accounts` endpoints are not among
  them: only this site's server and the MCP server's key lookup call them, with the dashboard secret.
- The channel paths name the agent with the `agentIdentifier` query parameter, as the rest of the API does; left out,
  it's the relay agent `setup` creates.
- Only the headers the API reads go on: `Authorization`, `Content-Type`, `Accept`, `User-Agent`,
  `Idempotency-Key`, `If-None-Match`, `If-Modified-Since`, `Novu-Application-Identifier`, `Novu-Analytics-Source` and
  `Agent-Inbox-Via`. This site's cookies never reach the API, and the API's `Set-Cookie` never reaches the browser.
- The caller's IP address goes on as `X-Forwarded-For`, taken from the `x-forwarded-for` Vercel sets, so the API's
  per-IP limits (keyless setups, one-time codes) count each caller, not this site.
- It only reaches the US API: Agent Inbox has no EU region for now. The invite and verify pages show a link the EU API
  issued (`?region=eu`) as not valid, and send its token nowhere.
- The longest call is the inbox's long-poll, which the API holds for up to 25 seconds; the route may run for 60.

## Configuration

| Variable                            | Default                  | Purpose                                                    |
| ----------------------------------- | ------------------------ | ---------------------------------------------------------- |
| `NEXT_PUBLIC_NOVU_API_URL`          | `https://api.novu.co`    | US API: where `/api` forwards to, and the server's calls for US Human accounts. |
| `NEXT_PUBLIC_NOVU_API_URL_EU`       | `https://eu.api.novu.co` | The server's calls for EU accounts. The pages and `/api` don't use it. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | —                        | Human Clerk app. Only the account pages use it.            |
| `CLERK_SECRET_KEY`                  | —                        | Human Clerk app, server only.                              |
| `AGENT_INBOX_DASHBOARD_API_SECRET`  | —                        | The API's `AGENT_INBOX_DASHBOARD_API_SECRET`, for `/v1/human/accounts`. Server only. |
| `NEXT_PUBLIC_MIXPANEL_TOKEN`        | —                        | Novu's Mixpanel project. Counts dashboard page views on the operator's profile; empty sends nothing. |

`NEXT_PUBLIC_` values are inlined at build time. The API URL never comes from a link itself.

## Analytics

Agent Inbox events go to Novu's Mixpanel project, named `… - [Agent Inbox]` (`AGENT_INBOX_EVENTS` in
`@novu/shared`). The API sends what agents and operators do; this app only adds `Page Viewed - [Agent Inbox]`
for each dashboard page (`components/analytics`). Both use the id of the hidden Novu user behind the account, so
one operator is one profile. The page sends a page's path only, never its query, which can hold a one-time
token, and nothing about the operator besides that id. Its calls to the API say `Novu-Analytics-Source: dashboard`.

## Checks

```sh
pnpm --filter @novu/human-dashboard typecheck
pnpm --filter @novu/human-dashboard build
pnpm exec biome check apps/human-dashboard
```
