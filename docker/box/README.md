# Novu Box

One container that runs the Novu Cloud stack (enterprise API, worker, socket worker, dashboard) with all of its
data stores, so a PR can be tried end to end before it merges. Where it differs from staging, and why, is in
[FIDELITY.md](./FIDELITY.md).

The image holds tools only. The Novu checkout, `node_modules`, builds and database files live under `/data`
(a named volume locally, a snapshot later), so one image serves every box:

1. `box bake` builds a "golden" `/data` from a ref (about 12 minutes).
2. `box start` boots from it (about 20 seconds to a healthy API).
3. `box apply-pr <n>` puts a PR on a running box and rebuilds only what it changed (about 1 to 6 minutes).

## What runs inside

process-compose supervises everything under tini (`process-compose.yaml`):

| Process | What it is |
|---|---|
| `mongo` | MongoDB 8, single-node replica set `rs0` |
| `redis-7000..7002` | Redis 7.2 cluster, TLS with a CA made per box |
| `clickhouse` | ClickHouse 24.3 |
| `s3` | versitygw (S3 API), random keys per start, bucket `novu-box` |
| `sqs` | ElasticMQ (SQS API), the 5 Novu queues and their DLQs (`config/elasticmq.conf`) |
| `mail` | Mailpit: catches all email, plus SMS, push and chat through `sink` |
| `sink` | `sink.mjs`: receives what the `generic-sms`, `push-webhook` and `chat-webhook` providers send and shows it in Mailpit |
| `migrate` | `box migrate`: replica set, Redis cluster, Mongo indexes, ClickHouse migrations, S3 bucket |
| `api`, `worker` | `pnpm deploy` output under `pm2-runtime -i 2`, as in the production images |
| `socket` | The socket worker (Cloudflare Worker) under `wrangler dev`, for realtime Inbox |
| `dashboard` | The built dashboard served by Caddy, with runtime env injected into `index.html` |
| `stripe` | `stripe listen`, forwarding sandbox webhooks to the API |
| `bridge` | `next dev` of `playground/nextjs`: a self-hosted Novu app with code-first workflows and agents (`src/app/novu/`) on the checkout's `@novu/framework`, at `http://bridge.box.internal:4000/api/novu` |

Settings shared by every box are in `config/box.env`. Secrets come only from the `docker run` environment.

## Ports

| Container | Host (examples below) | Service |
|---|---|---|
| 4200 | 14200 | Dashboard |
| 3000 | 13000 | API |
| 8887 | 18887 | Socket worker (Inbox realtime) |
| 8025 | 18025 | Mailpit UI and API |
| 4566 | 4566 | S3 (presigned upload URLs point here) |

## Secrets

Copy `secrets.example.env` to `docker/box/.env` (gitignored and dockerignored) and fill it in with
preview-only values. A box runs PR code, and that code can read its environment, so:

- never use production keys, or Novu's own account (`NOVU_API_KEY`);
- use a staging key only when it can't change anything (the LaunchDarkly SDK key only reads flags);
- never name a secret `VITE_*`: those end up in the dashboard's public `index.html`;
- don't run boxes for PRs from forks.

| Secret | Service | Used by |
|---|---|---|
| `LAUNCH_DARKLY_SDK_KEY` | LaunchDarkly project `default`, environment `dev` (staging's) | API, worker |
| `CLERK_SECRET_KEY` | Clerk app `novu-box`, development instance | Bake (seeds the user and org), API, `smoke.mjs` |
| `STRIPE_API_KEY` | Stripe sandbox `Novu Box` | Bake (puts the org on Team), `stripe listen`, API |
| `GITHUB_TOKEN` | GitHub, read access to `novuhq/novu` and the enterprise submodule | `bake` and `apply-pr` only; pass it with `-e`, it's never written to disk |
| `BULL_MQ_PRO_NPM_TOKEN` (optional) | Taskforce.sh registry | Bake; without it the box runs open-source BullMQ |
| `NOVU_MANAGED_CLAUDE_API_KEY` (optional) | Anthropic, a workspace with a monthly spend limit | Start (runs thalamus and seeds the `box-managed` agent), API, bridge app (real models for its agents) |

The dashboard signs in as `agent@novu.co` / `Agent123!@#` (a Clerk test user, `*@novu.co` only). All boxes share
the Clerk development instance and its one seed org, and every bake re-links that org to the new box. Older
boxes stop signing in correctly after a newer bake.

## Use it

Build the image (seconds after the first build):

```sh
docker build -t novu-box:dev docker/box
```

Bake from `next`, or from any branch, tag or SHA:

```sh
GITHUB_TOKEN=$(gh auth token) docker run -d --name novu-box-bake -e GITHUB_TOKEN \
  --env-file docker/box/.env -v novu-box-data:/data novu-box:dev bake next
docker logs -f novu-box-bake   # ends with "baked next at <sha>"; then: docker rm novu-box-bake
```

Start the box:

```sh
docker run -d --name novu-box --env-file docker/box/.env -v novu-box-data:/data \
  -p 13000:3000 -p 14200:4200 -p 18887:8887 -p 4566:4566 -p 18025:8025 novu-box:dev
```

Open the dashboard at http://localhost:14200 and Mailpit at http://localhost:18025.

Put a PR on the running box:

```sh
GITHUB_TOKEN=$(gh auth token) docker exec -e GITHUB_TOKEN novu-box node /opt/box/box.mjs apply-pr 12821
```

`apply-pr` merges the PR onto the baked commit (like CI's merge ref) and stops if the two conflict. It then
reinstalls if the lockfile changed, builds the projects `nx affected` reports, redeploys the API and worker,
runs migrations and restarts what changed. A PR that changes `@novu/framework` or `playground/nextjs` also
restarts the bridge app and syncs it again, so the PR's workflows and agents run on the PR's framework.

Run the smoke test from the host (38 checks, 43 with the Anthropic key, about 2 minutes; writes `smoke.json` to
the directory given):

```sh
node --env-file=docker/box/.env docker/box/smoke.mjs /tmp/box-smoke
```

It signs in through Clerk, checks the Team plan, creates a workflow with in-app, email, SMS, push and chat
steps, triggers it, and checks the activity feed (Mongo), the Inbox and its realtime event, the run log
(ClickHouse), Mailpit for the email and the three sink messages, a delay step through SQS, and an S3 upload.
Then it runs the bridge app's workflows: sync status, a preview with controls, every channel with a skipped step,
a delay feeding a custom step's output into an email, a digest, Local mode discovery, the `localhost` guard,
and a throttle. And it chats with the bridge app's agents over web chat: a card with a table, a chart and a
button click, conversation metadata, a tool run after approval, a HITL approval, a workflow triggered by the
agent, an edited and a deleted reply, a custom event, and resolving the conversation with its `onResolve`
workflow, then a tool approval on the AI SDK and the LangChain agents.

The playground (`playground/nextjs`) is the catalog of agent features: every new feature gets a demo there. It has
one agent per `novu connect` runtime, all built on the same features
(`playground/nextjs/src/app/novu/agents/features.ts`), and all three share the reaction, edit, delete, resolve and
card-click handlers:

- `custom-code-agent` (`agent()` from `@novu/framework`) has no model. Each feature is a typed command (`card`,
  `remember <text>`, `recall`, `notify <name>`, `done`, `progress`, `delete`, `file`, `quote`, `react`, `emit`,
  `approve`, `multi-approve`, `custom-approve`, `custom-chrome-approve`, `ask`, `choose`, `tell`,
  `weather <city>`); anything else lists them. It works the same with or without the key. It's the only agent
  with HITL (`approve`, `ask`, `choose`, `tell`), because only plain `agent()` handles the answer. `file`,
  `quote`, `react` and `multi-approve` need Slack (see `FIDELITY.md`, "Web chat limits").
- `ai-sdk-agent` and `langchain-agent` get every other feature as a tool and, with
  `NOVU_MANAGED_CLAUDE_API_KEY`, run on Claude Haiku, which picks the tools from plain sentences and also reads
  attached images and PDFs (this spends from the key's workspace, not Novu's managed-Claude quota). The smoke
  test then adds 2 checks: a card from a tool on each. Without the key they run on scripted fakes that only know
  the gated `get_weather` tool.

With `NOVU_MANAGED_CLAUDE_API_KEY`, `start` also runs the thalamus observer and seeds `box-managed`, a managed
agent on the Novu-managed Claude integration (Claude Haiku, only the `bash` tool, which asks before it runs).
The smoke test then adds 3 checks: a reply, a `bash` run after approval, and the demo quota. They call Anthropic
for real; Novu's own caps still apply (10 managed-Claude conversations per org per month, 100,000 tokens per
conversation). Each run uses 2 conversations, so a box passes these checks 5 times, then hits the cap like a real
org would.

Other commands, run with `docker exec novu-box node /opt/box/box.mjs <command>`:

- `status` lists processes. Logs are in `/data/logs/process-compose.log`.
- `quiesce` stops the apps, then the databases, leaving the supervisor up for a snapshot.
- `seed-channels` adds the SMS, push and chat integrations to a box baked before the sink existed.
- `seed-bridge` does the same for the bridge app. Every `start` syncs the bridge again, so new workflows in a new
  image show up.

## What the bake seeds

- A Novu user and org from the Clerk seed user and org, created by the API on first sign-in, as in production.
- Mailpit (`nodemailer` over SMTP) as the primary email integration in every environment.
- `generic-sms`, `push-webhook` and `chat-webhook` integrations pointing at the sink, and a phone number, push
  token and chat webhook on the seed user's subscriber, so the dashboard's Test Workflow reaches every channel.
- The bridge app synced to the Development environment. It signs with that environment's secret key, which the
  bake writes to `/data/bridge/secret-key`. Each of its agents is created, linked to web chat and pointed at the
  bridge.
- The org on the Team plan: a test card on its Stripe customer and its subscription moved to the Team prices.
  Novu's own webhook handler, fed by `stripe listen`, then sets the tier. For checkout by hand, use the test card
  `4242 4242 4242 4242`.

## External services

- **Clerk:** app `novu-box`, development instance, with settings copied from staging. Only the development
  instance is used; the production app `Novu Cloud` is never touched.
- **Stripe:** sandbox `Novu Box`, with staging's 12 prices copied and Stripe Tax on, so Upgrade works.
- **LaunchDarkly:** staging's project and environment through a read-only SDK key. Box orgs get staging's
  default rules like any new customer.
- **SQS:** ElasticMQ in `sqs_bullmq` mode: every job goes through the SQS API as on staging, and delays over
  15 minutes are held in BullMQ instead of EventBridge Scheduler.

## Troubleshooting

- **The bake fails at "first boot" with ClickHouse `NOT_ENOUGH_SPACE`:** Docker's disk is full. A baked volume
  is about 6 GB; remove old box volumes and dangling images.
- **The dashboard signs in but shows the wrong org, or none:** a newer bake re-linked the shared Clerk org.
  Use the newest box.
- **Mailpit has no SMS, push or chat:** check `sink` in `status`, and that the step's integration is one of
  the `Box ... (sink)` ones.
