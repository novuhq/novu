# Where the Novu Box differs from staging

The box aims to match Novu Cloud (staging/production). Everything below is a known difference, why it exists,
what a PR tester would miss, and what closing it would take. Keep this list current when the box changes.

## Infrastructure

| Area | Staging / production | Box | What a PR tester misses | To close it |
|---|---|---|---|---|
| Queues | `QUEUE_BACKEND=sqs` on AWS SQS | `sqs_bullmq` on ElasticMQ (same SQS API) | SQS fair queues (per-org fairness), duplicate or out-of-order delivery, throttling, 4-day retention | Not possible locally; staging load tests |
| Long delays (> 900 s) | EventBridge Scheduler fires them into SQS | Held in BullMQ (`sqs_bullmq`) | The EventBridge path | No emulator fires schedules |
| Large queue messages (> 256 KB) | Offloaded to S3 | Fail: the offload client reuses `SQS_ENDPOINT` for S3 | Payload offload | Code change: a separate S3 endpoint for offload |
| BullMQ | Pro (`@taskforcesh/bullmq-pro`, org groups) where BullMQ is used | Open-source BullMQ, `NOVU_MANAGED_SERVICE` unset | Little: staging jobs run on SQS | `BULL_MQ_PRO_NPM_TOKEN` at bake |
| `NOVU_MANAGED_SERVICE` | `false` (API), `true` (worker) | Unset | Mongo TTL indexes stay on in the box (Cloud archives instead); New Relic metrics | Set per process if it ever matters |
| Redis | MemoryDB / ElastiCache cluster | 3-node Redis 7.2 cluster, TLS with a self-signed CA, one host | Network partitions, failover | - |
| Mongo | Atlas cluster, online archive | Single-node replica set `rs0` | Failover, archive | - |
| ClickHouse, S3 | Managed ClickHouse, AWS S3 | Single-node ClickHouse, versitygw (S3 API), random keys per start | Managed-service behaviour | - |
| Processes | Autoscaled API, separate internal API, one worker service per queue | API and worker, 1 pm2 instance each (cluster mode) | Scaling, per-queue worker isolation, races between processes | `PM2_INSTANCES=2`: boot takes ~49 s instead of ~29 s and 1.7 GB more |
| Legacy `ws` service | Running | Off; the socket worker (PartySocket) serves realtime | Jobs pile up unread in the `novu-web-sockets` queue | - |
| `NODE_ENV` | `dev` on staging, `production` in production | `production` (matches production) | Staging-only `dev` behaviour (Swagger explorer, http profile URLs, popular-template IDs) | - |
| `NOVU_REGION` | `eu-west-2` (staging) | Unset | LaunchDarkly region targeting, EU/US Human dashboard URL, Plain cards key | One line in `box.env` |

## Services that are off

| Service | Effect in the box | To turn on |
|---|---|---|
| Outbound webhooks (Svix) | Settings → Webhooks can't load; no events go to customer endpoints | A dedicated Svix test environment key (never staging's) |
| Provider status webhooks (`apps/webhook`) | No delivery receipts from providers | Inactive app; the fake providers send none anyway |
| Inbound email (`apps/inbound-mail`) | Reply-to-email and inbound parse don't work | Service plus DNS; off by decision |
| Step resolver (Cloudflare dispatch) | Custom-code steps that need it don't run | `STEP_RESOLVER_*`; off by decision |
| Thalamus | Off unless the box starts with `NOVU_MANAGED_CLAUDE_API_KEY`; then it runs under `wrangler dev` | - |

## Channels

| Channel | Box | Exercised | Not exercised |
|---|---|---|---|
| Email | `nodemailer` (SMTP) to Mailpit | Everything up to the provider; the real HTML email | SendGrid/SES/... adapters, bounces, delivery events |
| SMS, push, chat | `generic-sms`, `push-webhook`, `chat-webhook` to `sink.mjs`, shown in Mailpit | Everything up to the provider: workflow, rendering, subscriber lookup, activity, retries | Twilio/FCM/APNs/Slack adapters, provider overrides, real errors and rate limits, delivery receipts, how the message looks on a device |
| Novu demo providers | Absent (`NOVU_EMAIL_INTEGRATION_API_KEY`, `NOVU_SMS_INTEGRATION_*`) | - | The "Novu" email/SMS demo integrations |
| Inbox | Real (socket worker, `VITE_WEBSOCKET_TYPE=cloud`) | Realtime, feed, preferences | - |

## Code-first workflows and agents (bridge app)

The `bridge` process runs `playground/nextjs`, which serves workflows and three self-hosted agents with the
checkout's `@novu/framework`, signed
with the Development secret key, through the same SSRF guard as a customer's bridge (allow-listed as
`bridge.box.internal`). Agents reply through the public API URL, which Caddy also serves inside the box.

| Area | Difference |
|---|---|
| Environments | Only Development is synced; Production would need its own secret key and a second sync |
| Bridge app server | `next dev`, not a production build: `next build` of the playground fails its type check and needs more memory than the box has. Each route compiles on its first request (a few seconds), and the HMAC signature check stays on (`NOVU_STRICT_AUTHENTICATION_ENABLED`) |
| Content renderers | No react-email, Vue or Svelte templates; they render inside the customer's app, outside Novu |
| `novu dev` tunnel (novu.sh) | Not used; Local mode is tested by pointing it at the bridge directly |
| Deploy paths | `novu sync` and the GitHub Action aren't run; the box makes the same requests they make (`POST /v1/bridge/sync`, then `PUT /v1/agents/:id/bridge`), but signs the agent discovery (see "Bugs found") |
| Agent models | With the Anthropic key, the AI SDK and LangChain agents run on Claude Haiku only (no OpenAI or other providers). Without it they run on scripted fakes (`MockLanguageModelV4` from `ai/test`, a `BaseChatModel` subclass): no provider calls, streaming or real tool choice |
| Agent channels | Web chat only; Slack, Teams, WhatsApp and the rest need partner apps |
| Web chat limits | Shows typing, edits, deletes and custom events (`ctx.emit`). Rejects file replies (`attachment_failed`) and agent reactions (including the resolve reaction, logged as "Failed to add resolve reaction"), and drops `quoteReply`. Users can't react, edit, delete or attach, so `onReaction`, `onMessageUpdated`, `onMessageDeleted` and image or PDF input are untested. HITL `to` (`multi-approve`) needs other subscribers in the thread. All of these wait for Slack |

## Auth, billing and flags

| Area | Box | Difference from staging |
|---|---|---|
| Clerk | Dev instance of the `novu-box` app, shared by all boxes | Separate app with copied settings; test mode on; allowlist `*@novu.co`; passkeys count as 2FA; `force_organization_selection`; one shared seed user and org, re-linked on every bake (org ID changes) |
| Stripe | `Novu Box` sandbox with the 12 staging prices copied | One shared customer per bake; `stripe listen` can drop events; demo tax head office |
| LaunchDarkly | Staging's project and environment, read-only SDK key | Box orgs get staging's default rules like any new customer (rate limiting on, Agents tab visible) |

## Novu-internal and third-party features

| Feature | Effect in the box | Why |
|---|---|---|
| Novu's own account (`NOVU_API_KEY`, `NOVU_SECRET_API_KEY`, `VITE_NOVU_APP_ID`) | Invite, invite-accepted and password-reset emails are skipped; the header Inbox bell (outside the workflow editor) gets 422; `/v1/novu/context` returns 500 | These are production keys; the box uses none |
| Keyless trial (`KEYLESS_ORGANIZATION_ID`, `KEYLESS_USER_EMAIL`) | Try-before-signup Inbox and keyless Connect don't work | Creating a keyless environment also needs `NOVU_MANAGED_CLAUDE_API_KEY` and the flags `IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED` and `IS_DEMO_MANAGED_CLAUDE_ENABLED`; that key also adds a Novu-managed Claude integration to every new Development environment while that flag is on |
| Blueprints (`BLUEPRINT_CREATOR`) | Template gallery of the old `/blueprints` API is empty | The current dashboard doesn't use it |
| Sanity CMS | Changelog cards and agent-template deep links fail (CORS) | `http://localhost:14200` isn't in the project's CORS origins |
| AI (`AI_LLM_*`, `CONTEXT_DEV_API_KEY`) | AI features fail; self-hosted agents work (Claude with the Anthropic key, scripted models without it) | Needs keys with spend limits. `OPENAI_API_KEY` isn't read by the API or worker, only by the CLI |
| Managed agents (`NOVU_MANAGED_CLAUDE_API_KEY`) | Without the key they fail. With it, only the Novu-managed Claude integration is seeded (not bring-your-own-key `anthropic` or `anthropic-aws`) | Bring-your-own keys would be stored in Mongo, and the box keeps no secrets under `/data` |
| Managed-agent MCP servers | Not seeded | Every catalog server needs OAuth with a real account (DCR or the provider's vault), and the Novu-managed integration drops provider-vault ones; connecting a DCR server by hand from the dashboard isn't tried yet |
| Partner apps (Slack, WhatsApp, Azure, GitHub MCP, Vercel) | Connecting them fails | Needs each app's credentials |
| Custom domains (`DOMAIN_CONNECT_PRIVATE_KEY`) | Domain Connect fails | No key; could generate a box-only one |
| Monitoring and marketing (New Relic, Sentry, Segment, Mixpanel, HubSpot, Intercom, Plain) | Off; `/v1/telemetry/measure` returns 404 | Box traffic must not reach real dashboards |

## Bugs found while building the box

- `subscribers` declares two indexes named `unique_subscriber_per_environment` with different key orders; `syncIndexes`
  skips one with a warning. Not fixed in the box; to report.
- Throttle steps fail on a Redis Cluster with more than one node. `RedisThrottleService`
  (`libs/application-generic/src/services/throttle/redis-throttle.service.ts`) runs `SCRIPT LOAD` through the
  cluster client, which sends it to one node, then `EVALSHA` on the node that owns the throttle key. When that node
  lacks the script, the NOSCRIPT retry loads it the same way and usually fails again, so the job is `failed`.
  Seen in the box: the key's slot (15376) was on node 7002, which was the only node without the script. It stays
  broken until the script happens to reach every node, and again after every Redis restart or failover.
  `smoke.mjs` runs the throttle check last for this reason. Not fixed; to report.
- `npx novu sync` never sets agent bridge URLs on a production bridge. `syncAgentBridgeUrls`
  (`packages/novu/src/commands/sync.ts`) calls `?action=discover` unsigned, and a bridge with
  `strictAuthentication` (the default outside development) answers 401, which the CLI swallows with a warning.
  `box.mjs` signs the request instead. Not fixed; to report.
- An approved tool on a plain `agent()` is recorded as denied on the next user message. After `onToolApproval`
  runs the tool, no tool result is recorded (`emitToolResult` is internal; only the AI SDK and LangChain
  adapters call it), so `findOrphanedApprovedToolApprovalRequests`
  (`apps/api/src/app/agents/shared/tool-approval/unresolved-approvals.ts`) takes the approval for a crashed
  resume and appends a `denied` decision. Seen in the box's `custom-code-agent` history. Not fixed; to report.
- HITL is only half wired into the AI SDK and LangChain adapters. `ctx.approve`/`ask`/`choose` post the card
  and the answer reaches `onAction`, but the adapters don't call the model again (they do after a tool
  approval), and the answer (`ctx.humanResponse`) isn't part of `toModelMessages` or `toLangChainMessages`.
  Nothing documents HITL for these runtimes, so the playground keeps HITL on `custom-code-agent` only. To ask
  the framework owners whether it's meant to work.
- One failed delivery silences the rest of an agent run. `AgentEventOutbox.flush()`
  (`packages/framework/src/resources/agent/agent-event-outbox.ts`) chains every batch onto `this.chain`; when
  a batch fails, the chain stays rejected, so every later batch (replies, `run-error`, `run-finish`) is skipped.
  Seen in the box: `file` in web chat gets `attachment_failed`, the bridge logs "Failed to report turn error",
  and the chat shows `run-start` with nothing after it. Not fixed; to report.
