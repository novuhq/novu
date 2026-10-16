# Novu Box

One container that runs the Novu Cloud stack (enterprise API, worker, socket worker, dashboard) with all of its
data stores, so a PR can be tried end to end before it merges. Where it differs from staging, and why, is in
[FIDELITY.md](./FIDELITY.md).

The image holds tools only. The Novu checkout, `node_modules`, builds and database files live under `/data`
(a named volume locally, a snapshot later), so one image serves every box:

1. `box bake` builds a "golden" `/data` from a ref (about 12 minutes).
2. `box start` boots from it (about 20 seconds to a healthy API).
3. `box apply` puts a PR, or your checkout's changes, on a running box and rebuilds only what they change (about
   20 seconds to 6 minutes).

`box.mjs` holds these commands and runs inside the box. `cli.mjs` runs on your machine and drives a box: start
it, sync your checkout to it, check it, read its logs (see "From your machine" below).

## What runs inside

process-compose supervises everything under tini (`process-compose.yaml`):

| Process | What it is |
|---|---|
| `mongo` | MongoDB 8, single-node replica set `rs0` |
| `redis-7000..7002` | Redis 7.2 cluster, TLS with a self-signed certificate made per box |
| `clickhouse` | ClickHouse 24.3 |
| `s3` | versitygw (S3 API), random keys per start, bucket `novu-box` |
| `sqs` | ElasticMQ (SQS API), the 5 Novu queues and their DLQs (`config/elasticmq.conf`) |
| `mail` | Mailpit: catches all email, plus SMS, push and chat through `sink` |
| `sink` | `sink.mjs`: receives what the `generic-sms`, `push-webhook` and `chat-webhook` providers send and shows it in Mailpit |
| `migrate` | `box migrate`: replica set, Redis cluster, Mongo indexes, ClickHouse migrations, S3 bucket |
| `api`, `worker` | `pnpm deploy` output under `pm2-runtime` in cluster mode, as in the production images (`PM2_INSTANCES=1`) |
| `socket` | The socket worker (Cloudflare Worker) under `wrangler dev`, for realtime Inbox |
| `dashboard` | The built dashboard served by Caddy, with runtime env injected into `index.html` |
| `stripe` | `stripe listen`, forwarding sandbox webhooks to the API |
| `bridge` | `next start` of `playground/nextjs`: a self-hosted Novu app with code-first workflows and agents (`src/app/novu/`) on the checkout's `@novu/framework`, at `http://bridge.box.internal:4000/api/novu` |

Settings shared by every box are in `config/box.env`. Secrets come only from the `docker run` environment.

## Ports

| Container | Host (examples below) | Service |
|---|---|---|
| 4200 | 14200 | Dashboard |
| 3000 | 13000 | API |
| 8887 | 18887 | Socket worker (Inbox realtime) |
| 8025 | 18025 | Mailpit UI and API, under `/mail` |
| 4566 | 4566 | S3 (presigned upload URLs point here) |
| 18080 | 18080 | All of the above on one address, by path: `/v1` `/v2` `/.well-known` API, `/ws` socket, `/novu-box` S3, `/mail` Mailpit, the rest the dashboard. Cloudflare boxes use it, because `workers.dev` gives a box one name |

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
| `BOX_SEED_PASSWORD` | The seed user's dashboard password, from the password manager | Bake (sets it on the Clerk user) |
| `STRIPE_API_KEY` | Stripe sandbox `Novu Box` | Bake (puts the org on Team), `stripe listen`, API |
| `GITHUB_TOKEN` | GitHub, read access to `novuhq/novu` and the enterprise submodule | `bake` and `apply` only; pass it with `-e`, it's never written to disk (`cli.mjs` takes it from `gh auth token`) |
| `BULL_MQ_PRO_NPM_TOKEN` (optional) | Taskforce.sh registry | Bake; without it the box runs open-source BullMQ |
| `NOVU_MANAGED_CLAUDE_API_KEY` (optional) | Anthropic, a workspace with a monthly spend limit | Start (runs thalamus and seeds the `box-managed` agent), API, bridge app (real models for its agents) |

The dashboard signs in as `agent@novu.co` with `BOX_SEED_PASSWORD`. All boxes share the Clerk
development instance and its one seed org. Every bake gives that org the same Novu ID (`SEED.novuOrgId` in
`clerk.mjs`), so the Clerk org links to it in every box, older bakes included. Boxes also share its Stripe
customer, so a billing change made in one box reaches the others through their `stripe` process.

Box URLs are public, like staging's. Anyone with a `@novu.co` address can sign up (the allowlist) and gets their own
org; the code Clerk emails them proves they own the address. The seed org stays behind the password. That holds
only while the Clerk instance has these two settings:

1. **User & authentication → Email → Sign-in with email → Email verification code: off.** Sign-in needs the
   password.
2. **Settings → Test mode: off.** With it on, Clerk accepts `424242` as the code for any made-up
   `+clerk_test@novu.co` address, so anyone could sign up.

Check them with `curl -s https://electric-sponge-6737.clerk.accounts.dev/v1/environment`: `email_address` must not
list `email_code` in `first_factors`, and `auth_config.test_mode` must be `false`.

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

Open the dashboard at http://localhost:14200 and Mailpit at http://localhost:18025/mail.

Put a PR (or a branch, or a full SHA) on the running box:

```sh
GITHUB_TOKEN=$(gh auth token) docker exec -e GITHUB_TOKEN novu-box node /opt/box/box.mjs apply 12821
```

`apply` merges the PR onto the baked commit (like CI's merge ref) and stops if the two conflict. It then
reinstalls if the lockfile changed, builds the projects `nx affected` reports, redeploys the API and worker,
runs migrations and restarts what changed. A PR that changes `@novu/framework`, `@novu/agent-toolkit` or
`playground/nextjs` also rebuilds the bridge app (about 45 s), restarts it and syncs it again, so the PR's
workflows and agents run on the PR's framework. It logs the plan before it runs it, for example
`plan: install no, build @novu/worker, restart worker` (about 20 s for that one).

Add `--full` to install, build and restart everything, as a bake does (about 5 minutes), when the box behaves in a
way the PR doesn't explain. `apply` also logs the PR's `PR Checks Passed` result from GitHub, and a `WARN` if
CI failed: the box skips type checks, so it can run code CI rejects.

One apply runs at a time; a second one stops with `another apply is running`. An apply that fails or is killed
after its checkout leaves `/data/.applying.json`, `doctor` reports it, and the next apply rebuilds what that one
touched as well as its own changes.

### From your machine: `cli.mjs`

`cli.mjs` drives a box from your checkout. Run it from anywhere in the checkout; `--box <name>` picks the box
(default `novu-box`, with the volume `novu-box-data`). Local boxes publish the same host ports, so one runs at a time.

| Command | What it does |
|---|---|
| `node docker/box/cli.mjs up` | Starts the box: creates it if needed, after baking `next` into an empty volume (about 12 minutes). Waits until `doctor` passes |
| `node docker/box/cli.mjs sync` | Puts this checkout on the box, committed or not, and rebuilds what it changes. `--full` as for `apply` |
| `node docker/box/cli.mjs doctor` | Whether the box is fit to test on, as JSON; `problems` says what isn't, and it exits 1 if any |
| `node docker/box/cli.mjs mail [search \| id]` | What the box sent, from its Mailpit: the newest messages (email, and SMS, push and chat from the sink), a search (`to:a@b.c`, `subject:Welcome`, `tag:sms`), or one message with its headers, links, Mailpit's HTML check (which email clients break on what) and a `view` URL to screenshot; `--html`, `--check-links`, `--limit <n>` |
| `node docker/box/cli.mjs logs [process]` | The last 200 lines (`--tail <n>`) of one process, or of all of them merged, as `name \| LEVEL context: message`; `--errors` keeps warnings and errors, `--follow` streams new lines. An unknown name lists the processes |
| `node docker/box/cli.mjs exec -- <command>` | Runs a command in the box's checkout (`/data/novu`) |
| `node docker/box/cli.mjs down` | Stops the box. Its volume, and so its data, stays; `up` starts it again |

`sync` puts the checkout on the box as `apply` puts a PR: it commits HEAD plus every change, untracked files
included and ignored files not, into one commit, and sends it as a git bundle. The box merges it onto the baked
commit and runs the same plan. Your own index and staging stay as they are. Measured on a running box:

| Change | Plan | Time |
|---|---|---|
| None since the last sync | nothing | 2 s |
| An API file, plus a new untracked file | build the API | about 55 s |
| A library (`@novu/application-generic`) | build the API and worker | about 55 s |

Untracked files are sent only inside the top-level folders the repo already has (`apps`, `libs`, `packages`, ...).
Untracked files elsewhere, such as scratch folders, tool state, or a screenshot or `.env` at the root, stay on your
machine; `sync` names them in its first line. `sync` stops before sending more than 25 MB, which code changes never
reach, and names the biggest changed files. It sends the enterprise submodule's commit, not uncommitted changes
inside `.source`.

### On Cloudflare: `--cloud`

The same commands with `--cloud` run the box on Cloudflare Containers. Every box's container runs in one host
Worker, `novu-box-host` (`cloud/worker.js`, one Durable Object per box), and each box has its own small Worker for
its address, `novu-box-<box>` (`cloud/thin.js`, no container), at `https://novu-box-<box>.cli-shortener.workers.dev`;
`--box` defaults to the current branch. That address is the box's one address (port 18080, see Ports), so the
dashboard calls the API same-origin there: unlike production, CORS isn't exercised.

You need `npx wrangler login` on the Novu Cloudflare account, `gh` signed in as someone with push access to
`novuhq/novu` (the box's Worker checks it on every control call), and `docker/box/.env`: its secrets go to the host.
`up --cloud` deploys the host if it isn't there (building the image for amd64 and pushing it once per change) and
the box's Worker if it isn't there, then wakes the box from its snapshot or, the first time, bakes `next`.
`up --cloud --deploy` redeploys the host (after a change to `docker/box`), which applies to every box; with the
same image, running boxes keep running. `delete --cloud` stops a box and deletes its snapshot reference and Worker.

After an hour without requests the box saves itself to a snapshot and stops; the next request gets a "waking up"
page and the box is back with its data. `BOX_IDLE_MINUTES=4 node docker/box/cli.mjs up --cloud --deploy` sets a
shorter wait for every box, to test the sleep; the next deploy without it goes back to 60. Asking a box for its
state (`/__box/state`) doesn't count as a request. Measured on standard-4:

| Step | Time |
|---|---|
| First `up` of a box (bake `next`) | about 16 min |
| `down` (stop apps and databases, snapshot, stop) | 18 s to 3 min |
| Wake, from the first browser request to a healthy API | 33 to 36 s |
| `sync`, an API change | 83 s |
| Smoke over the public address (box baked from `next`) | 19/20; the bridge check needs this branch's playground |
| `up --from base` for a new box (deploy its Worker, then wake from base's snapshot, no bake) | 106 s: 29 s deploy, 8 s until the address answers, 43 s wake |
| The same, the first time a snapshot is restored | 4 to 6 min (inside the start), once per snapshot |
| `up --deploy` of the host with the same image | about 1 min; running boxes keep running |

`up --cloud --box <new> --from <box>` starts a new box from another box's latest snapshot instead of baking: all
boxes share one Durable Object class, which is how Cloudflare documents snapshot sharing. Keep a `base` box, baked
from `next`, to start new boxes from, and leave it asleep: every sleep gives it a new snapshot, and the first box
started from a new snapshot waits 4 to 6 minutes. `up --cloud` without `--box` is your branch's box: a new one
starts from `base`, then gets your checkout, committed or not (as `sync`; `--no-sync` skips it). A branch that
doesn't contain `base`'s commit may conflict; rebase it on `next`.

Limits for now: each sleep leaves a snapshot image in the account's registry that nothing deletes yet
(`npx wrangler containers images list`); the GitHub token reaches the bake's and `sync`'s environment, as it does
locally; requests the box makes to its own public address go out through the internet; a host redeploy with a new
image is untested with boxes running.

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
for real; Novu's own caps still apply (100,000 tokens per conversation, and 200 managed-Claude conversations per
org per month instead of the default 10, see FIDELITY.md). Each run uses 2 conversations.

Other commands, run with `docker exec novu-box node /opt/box/box.mjs <command>`:

- `status` lists processes. Logs are in `/data/logs/process-compose.log`.
- `doctor` and `logs [process]`, which `cli.mjs` runs. `logs` reads `/data/logs/process-compose.log`, where
  process-compose writes every process's output.
- `state` prints the baked and applied commits, and an unfinished apply, as JSON.
- `quiesce` stops the apps, then the databases, leaving the supervisor up for a snapshot.

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
- **The dashboard signs in but shows the wrong org, or none:** the box was baked before the seed org had a fixed
  ID (October 2026). Bake it again.
- **Mailpit has no SMS, push or chat:** check `sink` in `status`, and that the step's integration is one of
  the `Box ... (sink)` ones.
