# @novu/human-dashboard

Next.js app for [agentinbox.md](https://agentinbox.md): the website (a page for agents and one for people), the
instructions agents read, the pages people open from [`@agentinbox/cli`](../../packages/agentinbox)'s links, Agent
Inbox accounts with their dashboard, and the Agent Inbox API (`/api`).

| Route             | What it is                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `/`               | The page for agents ("for robots"): the CLI on one page of light paper, from install to exit codes and flags, beside a dithered robot arm. People go on to `/sapien`. See [the ADR](../../packages/agentinbox/docs/adr/0002-agentinbox-md-root-is-the-page-for-agents.md). |
| `/sapien`         | The page for people: what Agent Inbox does, with the setup command, a prompt to copy, and a "sign in" link into the dashboard. |
| `/index.md`, `/llms.txt` | `/` as Markdown, made from the same data, and the index that points language models to it, to `/agents.md` and to each host's page. |
| `/[host]`, `/[host].md` | A page for each host Agent Inbox has steps for (`/claude-code`, `/codex`, `/chatgpt`, …), and the same as Markdown for agents (`/claude-code.md`, rewritten to `/claude-code/index.md`). Each opens with what to tell the agent, then the same steps as the dashboard's host picker, with "sign in to get your code" where the dashboard has the code. Built from the host list in `src/lib/hosts.ts`; any other address at that level is not found. |
| `/robots.txt`, `/sitemap.xml` | For search engines: the website pages (the two above and the host pages), at `https://www.agentinbox.md` (`SITE_ORIGIN` in `src/lib/seo.ts`). Until launch they stay out of search results: the pages and their Markdown and `/llms.txt` say `noindex`, the sitemap is empty and robots.txt doesn't point to it. `SITE_INDEXED` in `src/lib/seo.ts` turns that off. Preview deployments always send `noindex`. |
| `/agents.md`      | What agents read, in Markdown: how to connect with the commands from the dashboard, how to set themselves up without a code (`setup` and `login`, which the operator approves), each host's page, then the agentinbox skill from [agentinboxhq/skills](https://github.com/agentinboxhq/skills), as `npx skills add` installs it. The home page links to it. |
| `/.well-known/agent-skills/` | The skills from agentinboxhq/skills, for [Agent Skills discovery](https://github.com/cloudflare/agent-skills-discovery-rfc): `index.json` lists them, and each downloads from under the commit it came from, as `<commit>/<name>.tar.gz`, or `<commit>/<name>/SKILL.md` for a skill that is only that file. `npx skills add https://www.agentinbox.md` reads it. |
| `/p/[handle]`     | An agent's public card: anyone with the link sees the agent and every way to reach it, without signing in. `opengraph-image` is the picture apps show where the link is shared. |
| `/invite/[token]` | Opened from a `contact invite` link. The person picks which of the agent's channels (Email, Telegram, Slack) it may reach them on, and their default. |
| `/verify/[token]` | Opened from the "Verify this email" button, sent before the agent emails a new address: the operator's own, or a contact's (invited by email, or picked on the invite page). Confirms it once. |
| `/connect`        | Opened from `channel add telegram` or `channel add slack` when the operator finishes in the browser. The setup token stays in the URL fragment. |
| `/connect/slack/result` | Where Slack sends the operator after they approve or deny the Agent Inbox app.        |
| `/sign-up`, `/sign-in` | Agent Inbox accounts, signed in with the Agent Inbox Clerk app (not the Novu dashboard's). Their `sso-callback` pages finish a sign-in through another service. |
| `/onboarding`     | Where a new operator lands after signing up: four steps (Address, Test, Connect, Reach) that make the agent and connect it to a host. One address; the step comes from how far the setup got. |
| `/inbox`, `/configure`, `/contacts` | The dashboard: the agent's inbox, the agent with its channels and hosts, and the people it can ask. An operator without an agent is sent to `/onboarding`. |
| `/configure/share-image` | The operator's agent card as an image, for the Share dialog's preview and its Download image. |
| `/settings`, `/settings/billing` | The operator, their API key (show, copy, regenerate), log out and delete account; the plan, with nothing charged during early access. |
| `/claim`          | Opened from the link an agent gets when its keyless setup runs out of free messages. Moves that setup into the operator's account. |
| `/cli/login`      | Opened by the CLI's `login`, with its code in the link. The page shows the code and the computer's name to compare with the terminal, and the signed-in operator approves or denies; a keyless setup on that computer moves into the account on the way. |
| `/mcp/connect`    | Where sign-in sends someone whom ChatGPT, Claude or Cursor sent to connect to the Agent Inbox MCP server. It makes sure their account exists, then goes back to Clerk to let the app in. |
| `/api/*`          | The Agent Inbox API, which forwards to the Novu API, so people only ever see this site's address. See [Agent Inbox API](#agent-inbox-api). |
| `/api/webhooks/clerk` | The Agent Inbox Clerk app's webhook: a sign-up (`user.created`) gets its account before the operator opens any page. Off without `CLERK_WEBHOOK_SIGNING_SECRET`; the first dashboard visit does the same then. |

Each Agent Inbox account has a backing organization, which the API creates through the private
`/v1/human/accounts` endpoints. See
[the ADR](../../packages/agentinbox/docs/adr/0001-separate-clerk-app-with-backing-organizations.md) and the
[Agent Inbox glossary](../../packages/agentinbox/CONTEXT.md).

## Website

`/` and `/sapien` came over from the `novuhq/human-website` repo as they were designed (Figma file "Human.md", frames
`256:3424` and `874:9900`). Each section keeps its words and pictures in a data file, `src/data/home.ts` for `/` and
`src/data/sapien-*.ts` for `/sapien`; copy that Figma doesn't show is marked `// Draft copy — not in Figma`.

Both pages show the CLI's commands as text written by hand. When a command, flag or exit code changes, change
`src/data/home.ts` (also `/index.md`), the examples in `src/data/sapien-building-blocks.ts` and
`src/data/sapien-integrations.ts`, the prompt in `src/data/sapien-closing.ts`, and the hosts' steps in
`src/lib/hosts.ts` (the host picker and the host pages).

`/sapien` has its own black, text and surface colours (`--color-sapien-*` in `src/styles/globals.css`) and its own
faces, Inter and IvyPresto (`src/lib/sapien-fonts.ts`); `/` styles itself in `src/styles/home.css` with Geist Mono.
Neither changes how the dashboard looks. The dither effect on `/` is vendored (`src/vendor/interactive-dither`, MIT).

## Onboarding

An operator gets an agent in one of two ways, and both end in the dashboard:

- **Sign-up in the dashboard.** `/onboarding` walks them through the four steps. Step 3 hands the agent to a
  host: the operator picks it from the host picker and gets its steps, the commands they run in their
  terminal, carrying a one-time code, or a chat app's sign-in; step 4 sets up Telegram and Slack in the
  same drawers as Configure, over the step. "Later" or "Skip the test" on step 2 open the dashboard early;
  banners on Inbox and Configure lead back to the step that was left.
- **Claim from the CLI.** The agent was made in a terminal and comes with the claim (`/claim`, or
  `/cli/login` with a setup to keep). It has its address and its host, so its operator skips the steps.

How far an operator got is kept in the private metadata of their Clerk user (`lib/onboarding-state.ts`).
An agent that is older than its operator's first visit to step 1 never goes through the steps: it was in
use before, however the operator came to see that step.

More hosts connect later from Configure, in "Connect another agent": the same host picker, with a new code.

The hosts are one list, `src/lib/hosts.ts`, which the picker and the public host pages (`/claude-code`) are built
from. A host that runs commands (Claude Code, Codex, OpenCode, Cursor, Hermes, OpenClaw, General) gets the commands
first, with its own skills line (`npx skills add … --agent claude-code -y`), and its second way in under them: a
plugin, or the MCP server in its own config. A chat app (Claude, ChatGPT, Grok Bot) only signs in to the MCP server.
The picker ticks the hosts that connected already; today that's the apps the MCP server tells apart
(`connectedTools`). `?connect=codex` on `/configure` opens "Connect another agent" on that host, which is where a
host page's "sign in to get your code" leads.

The connect box shows only the commands for now. It also had a prompt that asked an agent to run them, but an
agent's own permission checks (Claude Code's auto mode) stop it from saving a key and installing a skill on a
pasted request, so the operator runs them.

## Develop

```sh
cp apps/human-dashboard/.env.example apps/human-dashboard/.env.local
pnpm start:human-dashboard         # http://localhost:4300
```

Run the API locally (`pnpm start:api:dev`) with `HUMAN_DASHBOARD_URL=http://localhost:4300`, so the links it hands
out (invites, verification, claim, login) point here. Point the CLI at this site's `/api`
(`INBOX_API_URL=http://localhost:4300/api`): it only speaks the Agent Inbox API's paths, never the Novu API's. The
connect commands on the onboarding and in "Connect another agent" name that `/api` themselves.

To try an invite, run `npx @agentinbox/cli contact invite <id>` and open the printed link.

Agent Inbox accounts also need:

- a Clerk application for Agent Inbox (development instance is fine), with its keys in `.env.local`;
- `AGENT_INBOX_DASHBOARD_API_SECRET` here, with the same value as `AGENT_INBOX_DASHBOARD_API_SECRET` in the API's `.env`;
- an API running with the Clerk-backed enterprise auth and keyless enabled;
- if Novu's Clerk instance has an allowlist (the development one does), `*@users.agentinbox.md` on it. The
  accounts' backing users get made-up addresses there, and otherwise Clerk refuses them with `not_allowed_access`.

To try a claim, set `KEYLESS_HUMAN_INTERACTION_CAP=1` on the API, run `npx @agentinbox/cli setup` without logging
in, send two messages, and open the printed `/claim` link.

To try `login`, run `npx @agentinbox/cli login`: it opens `/cli/login` here with its code, and you approve it there.
The API only offers the browser login when `HUMAN_DASHBOARD_URL` is set.

`/agents.md` fetches the agentinbox skill from GitHub (`main` of agentinboxhq/skills) when the site is built, and
again at most once an hour, so a change merged there shows without a deploy. When GitHub can't be reached, the page
links to the skill instead.

`/.well-known/agent-skills/index.json` is made the same way, from GitHub's archive of the repository. Each skill's link
names the commit it came from, and a download under a commit never changes, so clients and the CDN keep it for a year.
When GitHub fails during a build, the index lists no skills until the next refresh; after that, a failed refresh keeps
the last index.

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
| `NEXT_PUBLIC_NOVU_API_URL`          | `https://api.novu.co`    | US API: where `/api` forwards to, and the server's calls for US accounts. |
| `NEXT_PUBLIC_NOVU_API_URL_EU`       | `https://eu.api.novu.co` | The server's calls for EU accounts. The pages and `/api` don't use it. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | —                        | Agent Inbox Clerk app. Only the account pages use it.      |
| `CLERK_SECRET_KEY`                  | —                        | Agent Inbox Clerk app, server only.                        |
| `CLERK_WEBHOOK_SIGNING_SECRET`      | —                        | Signs the Agent Inbox Clerk app's webhook (`/api/webhooks/clerk`). Empty turns the webhook off. |
| `AGENT_INBOX_DASHBOARD_API_SECRET`  | —                        | The API's `AGENT_INBOX_DASHBOARD_API_SECRET`, for `/v1/human/accounts` and the MCP server's connections. Server only. |
| `AGENT_INBOX_DASHBOARD_URL`         | the page's address       | Where this site is served, the API's `HUMAN_DASHBOARD_URL`. Public card links and the prompts' `/api` use it. Server only. |
| `AGENT_INBOX_MCP_URL`               | —                        | The hosted Agent Inbox MCP server the chat apps connect to. Empty links their tiles to the docs instead. Server only. |
| `NEXT_PUBLIC_MIXPANEL_TOKEN`        | —                        | Novu's Mixpanel project. Counts dashboard page views on the operator's profile; empty sends nothing. |

`NEXT_PUBLIC_` values are inlined at build time. The API URL never comes from a link itself.

## Analytics

Agent Inbox events go to Novu's Mixpanel project, named `… - [Agent Inbox]` (`AGENT_INBOX_EVENTS` in
`@novu/shared`). The API sends what agents and operators do; this app only adds `Page Viewed - [Agent Inbox]`
for each dashboard page (`components/analytics`). Both use the id of the account's backing user, so
one operator is one profile. The page sends a page's path only, never its query, which can hold a one-time
token, and nothing about the operator besides that id. Its calls to the API say `Novu-Analytics-Source: dashboard`.

## Checks

```sh
pnpm --filter @novu/human-dashboard typecheck
pnpm --filter @novu/human-dashboard build
pnpm exec biome check apps/human-dashboard
```

The website's browser tests (`tests/`, Playwright) build the app and serve it on port 3102, so they can run beside
`pnpm start`. They aren't part of CI yet. Install their browser once:

```sh
pnpm --filter @novu/human-dashboard exec playwright install chromium
pnpm --filter @novu/human-dashboard test:e2e
```
