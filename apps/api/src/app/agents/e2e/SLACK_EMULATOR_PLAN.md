# Plan: e2e test the agent SDK ↔ Slack contract using emulate.dev

## Goal

Today, the agent e2e tests at `apps/api/src/app/agents/e2e/` exercise inbound
webhook parsing well, but the **outbound** path (anything the bridge calls back
to Slack — `chat.postMessage`, `chat.update`, `reactions.add`, threading, Block
Kit fidelity) is stubbed out via sinon on `ChatSdkService.postToConversation`
and friends. We never let a real Slack adapter make a real HTTP call, so a
contract drift in `@chat-adapter/slack`, `@slack/web-api`, or our `Card`
serialization can ship without a regression test catching it.

`emulate.dev` (npm: [`emulate`](https://www.npmjs.com/package/emulate)) ships a
stateful, in-process Slack Web API mock. By pointing the agent's Slack adapter
at it, we can exercise the *full* contract end-to-end inside a single Node
process with no Docker and no external network — and assert against what the
agent actually delivered to Slack.

## Why this works (the one critical compatibility fact)

`@chat-adapter/slack` constructs `WebClient` like this
(`node_modules/@chat-adapter/slack/dist/index.js:750`):

```js
const slackApiUrl = config.apiUrl ?? process.env.SLACK_API_URL;
this.client = new WebClient(undefined, {
  ...(slackApiUrl ? { slackApiUrl } : {}),
});
```

So setting `SLACK_API_URL=http://localhost:4003/api` (or threading `apiUrl`
through `createSlackAdapter` in `chat-sdk.service.ts:984`) routes every Slack
Web API call to the emulator with **zero production code change**.

The legacy notification provider at
`packages/providers/src/lib/chat/slack/slack.provider.ts:21` hardcodes
`https://slack.com/api` — that's a different code path (notification channel,
not agents) and is out of scope for this plan.

## What emulate.dev gives us

- `POST /api/chat.postMessage`, `chat.update`, `chat.delete`, `chat.meMessage`
- `POST /api/conversations.{list,info,create,history,replies,join,leave,members}`
- `POST /api/users.{list,info,lookupByEmail}`
- `POST /api/reactions.{add,remove,get}` ← lets us assert acknowledge / resolve emoji
- `POST /api/auth.test`, `bots.info`, `team.info`
- OAuth v2 (`/oauth/v2/authorize`, `/api/oauth.v2.access`) and incoming webhooks
- Programmatic API: `createEmulator({ service: 'slack', port, seed }).reset() / .close()`
- Bearer-token auth — accepts any token unless `oauth_apps` is seeded

## What it does NOT give us (and how we work around it)

The docs do not describe **inbound** Events API delivery (the emulator pushing
`event_callback` payloads to our `/v1/agents/:agentId/webhook/:integrationId`).
We keep using the existing helpers in
`apps/api/src/app/agents/e2e/helpers/providers/slack.ts`
(`signSlackRequest`, `buildSlackAppMention`, `buildSlackSubscribedMessage`,
`buildSlackChallenge`) to hand-craft signed inbound payloads. The win is on
the **outbound** side, where today we stub and tomorrow we'd assert against
real emulator state.

---

## Required pieces

### 1. Dependency

Add to `apps/api/package.json` devDependencies:

```json
"emulate": "^0.5.0"
```

### 2. Run the emulator alongside the API in-process

Create `apps/api/src/app/agents/e2e/helpers/slack-emulator.ts`:

```ts
import { createEmulator, type Emulator } from 'emulate';

let instance: Emulator | undefined;

export async function startSlackEmulator(): Promise<Emulator> {
  if (instance) return instance;

  instance = await createEmulator({
    service: 'slack',
    port: Number(process.env.SLACK_EMULATOR_PORT) || 4003,
    seed: {
      team: { name: 'Novu E2E', domain: 'novu-e2e' },
      users: [{ name: 'e2e-user', real_name: 'E2E User', email: 'e2e@novu.test' }],
      channels: [{ name: 'incidents', topic: 'P1 alerts' }],
      bots: [{ name: 'novu-agent' }],
    },
  });

  process.env.SLACK_API_URL = `${instance.url}/api`;
  return instance;
}

export async function stopSlackEmulator() {
  await instance?.close();
  instance = undefined;
}
```

Wire into the shared bootstrap at `apps/api/e2e/setup.ts` (next to the existing
mongo/clickhouse setup) so every e2e shard gets a fresh emulator. Use `port: 0`
to avoid clashes when shards run in parallel; propagate `instance.url` via
env into worker children if the test framework forks.

`SLACK_API_URL` must be set **before** `ChatSdkService` lazy-imports
`@chat-adapter/slack` for the first time. Setting it in `startSlackEmulator()`
inside `before()` is sufficient because the LRU cache in `ChatSdkService` only
constructs the adapter when the first reply / inbound event arrives.

### 3. Inspect the emulator from tests

Add helpers in the same file that wrap the emulator's REST API:

```ts
export async function getChannelHistory(channel: string, token = 'xoxb-test') {
  const res = await fetch(`${instance!.url}/api/conversations.history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
    },
    body: new URLSearchParams({ channel }).toString(),
  });
  return res.json() as Promise<{ ok: boolean; messages: SlackMessage[] }>;
}

export async function getReactionsForMessage(channel: string, ts: string, token = 'xoxb-test') {
  // POST /api/reactions.get { channel, timestamp }
  ...
}
```

### 4. Run the real bridge in-process

Today `apps/api/src/app/agents/e2e/mock-agent-handler.ts` is a manual `serve()`
endpoint started via `npx ts-node`. Refactor it so the test can `import { app }`
and `app.listen(0)` to grab a port; export the agent definition separately so
tests can vary handler behavior per scenario.

```ts
// helpers/bridge-server.ts
import express from 'express';
import { agent, serve } from '@novu/framework/express';

export function createBridgeApp(handlers: Parameters<typeof agent>[1]) {
  const app = express();
  app.use(express.json());
  const novuAgent = agent('e2e-agent', handlers);
  app.use('/api/novu', serve({ agents: [novuAgent], secretKey: process.env.NOVU_SECRET_KEY! }));
  return app;
}
```

In the test, point `ResolvedAgentConfig.bridgeUrl` (via the
`agentRepository.update`) at `http://localhost:<bridgePort>/api/novu`, and
**remove the sinon stub** of `BridgeExecutorService.execute` — the real bridge
HTTP roundtrip is what we want to exercise.

### 5. Token bookkeeping

`agent-test-setup.ts:50-80` already creates an integration with a fake
`signingSecret` and a `channelConnectionRepository` row carrying
`auth.accessToken = 'xoxb-fake-bot-token-for-e2e'`. The emulator accepts any
bearer token by default, so this needs no change. If we later test the OAuth
handshake, seed `oauth_apps` in the emulator config and exercise
`slack-oauth-callback.usecase.ts` against it.

---

## Test scenarios (in priority order)

### Scenario A — outbound roundtrip (smoke)

`apps/api/src/app/agents/e2e/agent-slack-roundtrip.e2e.ts`

1. `before`: start emulator; start bridge app; `setupAgentTestContext()`;
   patch agent with `bridgeUrl = http://localhost:<bridgePort>/api/novu`.
2. POST a signed `app_mention` event to
   `/v1/agents/:agentId/webhook/:integrationIdentifier` for channel `C_INCIDENTS`,
   text `<@UBOT> ping`.
3. The bridge's `onMessage` calls `ctx.reply('pong')`.
4. Assert via `conversations.history`:
   - One message with text `pong`
   - Posted in the same `thread_ts` as the inbound `app_mention`
   - `bot_id` matches the seeded bot
5. Assert the `ConversationActivity` row was persisted with
   `senderType=AGENT` and the platform message id matches the emulator's id.

### Scenario B — Card + Block Kit fidelity

1. Inbound text `card`.
2. Bridge replies with `Card({ children: [Actions([Button({ id: 'confirm' })])] })`.
3. Assert the message stored in the emulator carries a `blocks` array whose
   first block is `actions` with a `button` element of `action_id: confirm`.
4. POST a hand-crafted `block_actions` interactivity payload (signed) back to
   the webhook; assert the bridge's `onAction` fires (we can detect this by
   asserting a follow-up message in `conversations.history`).

### Scenario C — acknowledge / resolve reactions

1. Set agent `behavior.acknowledgeOnReceived = true`,
   `reactionOnResolved = 'white_check_mark'`.
2. Inbound message → assert `POST /api/reactions.get` shows `eyes` on the user
   message.
3. Bridge calls `ctx.resolve()` → assert `white_check_mark` was added.

### Scenario D — edit / delete

1. Bridge replies, then test calls `POST /v1/agents/:agentId/reply` with
   `edit: { messageId, content }`. Assert `chat.update` mutated the stored
   message.
2. Same flow but with `delete: true` — assert `chat.delete` removed it.

### Scenario E — OAuth (deferred)

Requires a small refactor: factor the hardcoded
`https://slack.com/api/oauth.v2.access` in
`apps/api/src/app/integrations/usecases/chat-oauth-callback/slack-oauth-callback/slack-oauth-callback.usecase.ts:30`
into an env var (`SLACK_OAUTH_BASE_URL` defaulting to current). Then drive the
existing usecase against the emulator's `/api/oauth.v2.access` with a seeded
`oauth_apps` entry.

---

## Lifecycle / isolation

```ts
before(async () => {
  await startSlackEmulator();
  bridge = createBridgeApp(handlers).listen(0);
  bridgePort = (bridge.address() as AddressInfo).port;
});

beforeEach(async () => {
  ctx = await setupAgentTestContext();
  await agentRepository.update(
    { _id: ctx.agentId },
    { bridgeUrl: `http://localhost:${bridgePort}/api/novu` },
  );
});

afterEach(async () => {
  await emulator.reset();              // wipe sent messages, replay seed
  testServer.getService(ChatSdkService)['instances'].clear(); // drop cached adapter
});

after(async () => {
  bridge.close();
  await stopSlackEmulator();
});
```

Each test creates a fresh `integrationIdentifier` (current pattern), so the
`ChatSdkService` cache key (`agentId:integrationIdentifier`) is naturally
unique. The explicit `instances.clear()` is a safety net in case we ever set
the same identifier twice.

---

## Production code changes

**Required: none** (env-var path works out of the box).

**Recommended (one small change, ~10 lines):** thread an optional `apiUrl`
through the resolved Slack agent integration credentials and pass it into
`createSlackAdapter` in `apps/api/src/app/agents/services/chat-sdk.service.ts`
so tests don't depend on a process-wide env var. This avoids the foot-gun of
forgetting to unset `SLACK_API_URL` between test files that run against the
real Slack API.

```ts
// chat-sdk.service.ts:984
slack: createSlackAdapter({
  botToken: connectionAccessToken,
  signingSecret: credentials.signingSecret,
  apiUrl: credentials.slackApiUrl,   // optional, undefined in prod
}),
```

**For Scenario E only:** make `SLACK_ACCESS_URL` in
`slack-oauth-callback.usecase.ts:30` and `SLACK_MANIFEST_CREATE_URL` in
`slack-quick-setup.usecase.ts:32` env-var configurable.

---

## CI / runtime cost

- In-process Node, port 4003 (or 0 → random). No Docker, no network.
- Add tests under the existing `#novu-v2` mocha grep — they'll join the
  `test:e2e:novu-v2` shard runner (`apps/api/scripts/run-novu-v2-e2e-shard.cjs`).
- `emulate@0.5` is ~170 KB unpacked.

---

## Risks / open questions

1. **`@chat-adapter/slack` also pulls in `@slack/socket-mode`.** Verify the
   agent flow uses HTTP Events API only — `chat-sdk.service.ts:handleWebhook`
   suggests it does, but confirm before assuming socket-mode never opens a
   connection during tests (it would try to phone home to the real Slack).
2. **emulate.dev v0.5 is early.** Block Kit fidelity for less common elements
   (rich text, file upload, modals) may be partial — start with Scenario A,
   validate B/C/D against the emulator's actual behavior, raise issues
   upstream as needed.
3. **No documented inbound Events API delivery.** We keep using the
   `signSlackRequest` helpers. If we ever want the emulator to *push* events
   to our webhook (e.g., to test slash commands or interactivity end-to-end
   via the same code path Slack uses in production), file a feature request
   or extend with a custom plugin.
4. **Inbound interactivity payloads** (`block_actions`, `view_submission`)
   need their own helper builders alongside the existing `buildSlackAppMention`.

---

## Sequencing

1. Land the helpers (`slack-emulator.ts`, `bridge-server.ts`) and
   Scenario A as one PR. Get the green smoke test in CI. **~1-2 days.**
2. Add Scenarios B (Card + Action) and C (reactions) — exercises Block Kit
   serialization and the acknowledge/resolve behavior config. **~1 day.**
3. Add Scenario D (edit / delete). **~half day.**
4. Refactor Slack adapter to accept an explicit `apiUrl` (optional cleanup so
   tests don't lean on a process env var). **~half day.**
5. Scenario E (OAuth) — only if there's appetite to also catch regressions in
   the OAuth handshake. Requires the small env-var refactor in
   `slack-oauth-callback.usecase.ts`. **~half day.**
