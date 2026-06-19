# Novu × Eve Integration — Design Spec

**Date:** 2026-06-19
**Status:** Design approved + implementation plan approved (grilled). Plan: `~/.claude/plans/ok-now-we-have-tingly-moth.md`
**Author:** Dima Grossman (with Claude)

## Summary

`@novu/eve` makes an [Eve](https://eve.dev) agent (Vercel's filesystem-first
"Next.js for agents") a first-class Novu "brain" through **a single unified Eve
channel** — `novuChannel()`, the default export of `agent/channels/novu.ts`. The
developer connects as many platforms as they want in the Novu dashboard (Slack,
Teams, WhatsApp, in-app Inbox, email replies, …); all flow through this one
channel. The agent's **identity, delivery, and multi-channel orchestration live
in Novu**, while Eve drives the conversation. Delivery rides Novu's existing
**agent reply flow**; no new transport protocol is invented.

DX goal: Clerk-for-Next.js style — **one channel file + dashboard connection is
the whole integration**, with progressively-disclosed power.

### The seam that makes it native

`@novu/framework` re-exports its card components **straight from `chat` (the
Chat SDK)** — `packages/framework/src/resources/agent/index.ts:13` exports
`Card, Button, Actions, Select, TextInput, …` from `'chat'`. Eve composes its own
Slack cards from that *same* Chat SDK card-builder. So **Eve and Novu already
speak one identical card vocabulary** — a card built once renders on both sides
with zero translation.

## Goals

- One opinionated path: add `agent/channels/novu.ts`, connect platforms in the dashboard.
- Unify user identity: the agent talks to a **Novu subscriber**, never a raw per-platform id. One subscriber can hold many concurrent cross-platform conversations.
- Novu is the layer for (a) triggering multi-channel workflows that **run the developer's own code**, and (b) all delivery (provider credentials, fan-out, preferences, digest, per-platform rendering).
- Cross-platform human-in-the-loop (approval/clarification/auth) with no per-platform work.
- Keep Eve tools **pure and portable** — the same agent runs unchanged on web/CLI/Slack.

## Non-Goals

- Replacing Eve's conversation/runtime model. Eve remains the brain.
- Per-channel `withNovu(channel)` wrappers (rejected in favor of the single channel).
- Tool-side imperative Novu access (`getNovuContext` inside tools) — rejected to keep tools pure.
- Consolidating `@novu/chat-adapter`'s duplicated bridge protocol into `@novu/framework` (future cleanup).
- Building new Novu providers/platform integrations (configured in the dashboard).
- `novuConnection()` workflow auto-discovery (north-star; deferred until Novu exposes an MCP that lists workflows).

## Build on `@novu/framework`, not `@novu/chat-adapter`

`@novu/framework` is the canonical Novu agent runtime contract. Relevant surface
(`packages/framework/src/index.ts`):

- `NovuRequestHandler` (`./handler`) — inbound: HMAC verify → parse `AgentBridgeRequest` → build `AgentContext` → dispatch → auto-reply if a handler returns content.
- `AgentContext` (impl `AgentContextImpl`, `resources/agent/agent.context.ts`) — `reply()`, `resolve()`, signal batching (`{ type: 'trigger', workflowId, to?, payload? }`, `{ type: 'metadata', … }`), `getSubscriber()`, `getHistory()`.
- `workflow` / `step` — code-first multi-channel workflow definitions; where developer code runs.
- Card components (re-exported from `chat`): `Card`, `Button`, `Actions`, `Select`, `SelectOption`, `TextInput`, `CardLink`, `CardText`, `Divider`.
- Protocol types: `AgentBridgeRequest`, `AgentReplyPayload`, `ReplyContent`, `ReplyHandle`, `Signal`, `TriggerSignal`, `AgentSubscriber`, `AgentConversation`, etc.

`@novu/chat-adapter` is a **sibling** (Chat SDK ⇄ Novu): does *not* depend on
`@novu/framework`, peer-depends on `chat`, carries its own copy of the bridge
protocol. `@novu/eve` is the analogous sibling (Eve ⇄ Novu) and builds on
`@novu/framework` directly — avoiding the `chat` peer dep and the Chat-SDK
`onNewMention`/`postMessage` abstractions Eve doesn't use.

## Eve facts the design relies on (from eve.dev docs)

- An agent is a filesystem: `instructions.md`, `agent.ts` (`defineAgent`), `tools/`, `connections/`, `channels/`.
- **Channels** = I/O edge (`defineChannel({ routes, events })` in `agent/channels/<id>.ts`); normalize input, own `continuationToken`, decide delivery. Built-in channels take options (e.g. `slackChannel({ credentials, events })`); `events` handlers receive `(eventData, channel, ctx)` and post via `channel.thread.post(...)`, `channel.postDirectMessage(...)`, `channel.state`.
- **Connections** = credentialed external capabilities the model discovers via `connection__search` and calls as `connection__<conn>__<tool>` (`defineMcpClientConnection` / `defineOpenAPIConnection`). A service can be **both** a channel and a connection (Linear is).
- Eve has **no unified card abstraction** — but composes Slack cards from the **Chat SDK card-builder** (same lineage as Novu's cards).
- **Unified HITL protocol:** `defineTool({ needsApproval: always()/once()/never()/predicate })`, the built-in `ask_question({ prompt, options, allowFreeform })`, runtime event `input.requested` → durable park at `session.waiting` → resume via `session.send({ inputResponses: [{ requestId, optionId }] })`. OAuth via `authorization.required`/`authorization.completed`. Each channel renders these to native affordances.
- Credentials via env (`process.env.*`) or Vercel Connect (`connectSlackCredentials("slack/my-agent")`, `connect("linear")`).
- Runtime events: `session.started`, `message.delta`/`reasoning.appended`, `actions.requested`/`action.result`, `input.requested`, `authorization.required`/`completed`, `message.completed`, `session.completed`, `session.failed`, subagent events.

## Architecture

```
        ┌──────────────── Novu Connect (unified layer) ─┐
        │ many platforms · credentials · subscriber      │
        │ identity · preferences · digest · per-platform │
        │ rendering · delivery + fan-out                 │
        └──────▲──────────────────────────────┬─────────┘
   (1) AgentBridgeRequest (any platform)  (4) AgentReplyPayload + workflow triggers
        (signed webhook; platform +            via AgentContext.reply() / signals
         integrationIdentifier + conversationId)
        ┌──────┴──────────────────────────────▼─────────┐
        │  @novu/eve  →  single channel: agent/channels/  │
        │                novu.ts  (novuChannel())         │
        │  reuses @novu/framework: NovuRequestHandler,    │
        │   AgentContext.reply()/signals, workflow/step,  │
        │   Card/Button/Select                            │
        │  adds: one defineChannel webhook route,         │
        │   zero-config event handlers, HITL↔card map,    │
        │   two-tier action round-trip, continuationToken │
        │   ⇄ conversationId, subscriber→auth, novuTool,  │
        │   channel.novu.*, novuView discovery            │
        └──────▲──────────────────────────────┬─────────┘
   (2) send(msg,{auth,continuationToken})  (3) Eve runtime events
        ┌──────┴──────────────────────────────▼─────────┐
        │              Eve agent (the brain)              │
        └─────────────────────────────────────────────────┘
```

- **Inbound (1→2):** Novu owns every connected platform, sends a signed `AgentBridgeRequest` to the single `novu` webhook. `@novu/eve` runs it through `NovuRequestHandler` (verify + parse + `AgentContext`), normalizes to an Eve user message, sets `auth` from the subscriber, maps `conversationId` → `continuationToken`, calls `send()`. One endpoint, all platforms.
- **Outbound (3→4):** observe Eve runtime events → `AgentContext` actions. Novu renders per-platform + delivers + fans out.

**Ownership split:** `@novu/eve` owns only the bridge (Novu handler/context ⇄ Eve
`defineChannel` + `send()` + events). Below is Novu (delivery, identity,
providers, workflow engine, rendering); above is Eve (reasoning, pure tools,
durable session).

## Public API surface

### 1. `novuChannel(options?)` — the unified channel (full zero-config default)

Default export of `agent/channels/novu.ts`. Bare `novuChannel()` already:
replies completed assistant messages as markdown, auto-renders Eve HITL as Novu
cards, round-trips clicks, and resolves per `resolveOn`. You write `events` only
to customize.

```ts
// agent/channels/novu.ts — the entire messaging integration
import { novuChannel } from "@novu/eve";

export default novuChannel();              // env keys + dashboard platforms; nothing else

export default novuChannel({               // all optional
  agentIdentifier: "support-bot",          // default: env NOVU_AGENT_IDENTIFIER
  credentials: connectNovuCredentials("novu/my-agent"), // or env NOVU_SECRET_KEY
  stream: true,                            // default false; opt-in ReplyHandle edits
  resolveOn: "session.completed",
  events: { /* Eve event handlers — see below */ },
  onAction(action, channel, ctx) { /* custom (non-HITL) card clicks */ },
});
```

### 2. `novuTool({ name, description, workflow })` — model-driven workflow triggers

Authored, typed-per-workflow tool the model can call ("trigger + execute user
code"). Gated by Eve's `needsApproval`. (North-star: a `novuConnection()` that
auto-discovers all workflows as `connection__novu__<workflow>` tools, deferred
until Novu exposes an MCP listing workflows.)

```ts
// agent/tools/escalate.ts
import { novuTool } from "@novu/eve";
export default novuTool({
  name: "escalate",
  description: "Alert the on-call engineer across their preferred channels.",
  workflow: "on-call-escalation",   // payload typed from the workflow's schema
});
```

### 3. `workflow` / `step` / card components — re-exported from `@novu/framework`

```ts
// novu/workflows/on-call-escalation.ts
import { workflow, step } from "@novu/eve";
export default workflow("on-call-escalation", async ({ payload, step }) => {
  await step.inApp("alert", () => ({ body: payload.summary }));
  await step.push("push", () => ({ title: "Escalation", body: payload.summary }));
  // ← arbitrary developer code runs here
});
```

### Credentials — `connectNovuCredentials(...)`

Env baseline (`NOVU_SECRET_KEY` + `NOVU_AGENT_IDENTIFIER`, works self-host /
non-Vercel) + optional Vercel Connect helper for a one-click, no-keys flow
(mirrors `connectSlackCredentials`).

## Customizing replies

Two layers, both Eve-native. Tools stay pure throughout.

**(a) Channel `events` handlers — the default seam** (mirrors `slackChannel({ events })`):

```ts
export default novuChannel({
  events: {
    "message.completed"(eventData, channel, ctx) {
      if (eventData.finishReason === "tool-calls") return;
      channel.thread.post(eventData.message);          // Eve-core surface
    },
    "input.requested"(eventData, channel, ctx) {
      // override the default HITL→card rendering if desired
    },
  },
});
```

The `channel` object = **Eve core** (`channel.thread.post(content)`,
`channel.thread.stream(...)`, `channel.state`) **+ namespaced `channel.novu.*`**
(`channel.novu.trigger(workflow, opts)`, `channel.novu.subscriber`,
`channel.novu.setMetadata()`, `channel.novu.resolve()`). No tool-side
`getNovuContext` — Novu access lives in handlers, where it belongs.

**(b) Opt-in co-located per-tool renderer** — a **named sibling export**; the
tool's `execute` stays pure:

```ts
// agent/tools/refund.ts
import { defineTool } from "eve/tools";
import { Card, CardText, Actions, Button } from "@novu/eve";

export default defineTool({ /* pure execute, returns data */ });

export const novuView = (result, ctx) =>
  Card([CardText(`Refund ${result.id} ✅`),
        Actions([Button("Undo", { action: "undo_refund" })])]);
```

`@novu/eve` auto-discovers `novuView` next to the tool and uses it for that
tool's `action.result`; otherwise falls back to the default markdown reply.

## Human-in-the-loop & the two-tier action round-trip

Eve's unified HITL (`needsApproval`, `ask_question`, `input.requested`) is
rendered by `@novu/eve` into Chat SDK cards (`Card`/`Button`/`Select`/
`TextInput`) and delivered by Novu on the subscriber's preferred platform —
identically across platforms, no per-platform branching. The agent code never
mentions Novu; it just writes pure tools with `needsApproval` or calls
`ask_question`.

**Round-trip is two-tier:**
1. **HITL-originated clicks** (from `ask_question`/approval/`input.requested`) auto-map to `inputResponses` and resume the durable session — zero wiring.
2. **Custom/arbitrary action ids** (snooze, unsubscribe, quick-reply on a normal reply card) land in the channel **`onAction(action, channel, ctx)`** handler — the dev resumes via `channel`/`send()`, triggers a workflow, sets metadata, or ignores (no model wake).

## Event → reply mapping (defaults)

**Real Eve event names** (pinned against `eve@0.11.6` `ChannelEvents`, correcting
the docs-inferred names): `turn.started`, `actions.requested`, `action.result`,
`message.completed`, `message.appended`, `reasoning.appended`,
`reasoning.completed`, `input.requested`, `turn.failed`, `turn.completed`,
`session.failed`, `session.completed`, `session.waiting`,
`authorization.required`, `authorization.completed`. (No `message.delta` — use
`message.appended`; no `session.started` — use `turn.started`; HITL parks at
`session.waiting`.)

| Eve runtime event | Default Novu action |
|---|---|
| `turn.started` | resume/create conversation from `continuationToken` |
| `message.appended` / `reasoning.appended` | if `stream:true`, throttled `ReplyHandle` edits; else buffer |
| `message.completed` | `ctx.reply({ markdown })` (Novu renders per platform) |
| `actions.requested` / `input.requested` | render `Card`/`Button`/`Select`/`TextInput`; round-trip per two-tier rules |
| `session.waiting` | (HITL park) keep the rendered prompt live; await the user response |
| `authorization.required` | `CardLink` to auth URL; `authorization.completed` resumes |
| `session.completed` | `resolve(summary)` if `resolveOn` set |
| `session.failed` / `turn.failed` | error reply + metadata; **not** resolved |

## Identity binding

- Inbound `AgentBridgeRequest` carries subscriber + conversation + platform.
- Eve `auth` = principal derived from the subscriber; `continuationToken` encodes `{ conversationId, integrationIdentifier, platform }`, decoded on resume.
- One subscriber → many concurrent cross-platform conversations, each its own Eve session keyed by `continuationToken`, all sharing the subscriber identity.
- Eve never holds a raw per-platform user id → identity unified by construction.

## Error handling & resilience

- **Inbound:** invalid HMAC → `401`; replayed delivery id → dedupe + `200` no-op; malformed → `400`. Never invoke the agent unverified.
- **Outbound:** reply failures → `AgentDeliveryError` (framework); bounded retry + backoff, then Eve-side error event/log; a failed delivery never resolves.
- **Token drift:** missing/undecodable `continuationToken` → start fresh; log a correlation id (Eve session ↔ Novu conversation).
- **Workflow trigger failures** (signals): isolated from the reply — log and continue.

## Config & DX

- Env-first; everything overridable via `novuChannel({...})` for multi-agent/region.
- Platforms connected in the **Novu dashboard**, not in code (dashboard-first, zero-deps-state).
- Streaming **off** by default; `stream: true` opts in where supported.

## Testing strategy

- **Unit:** signature verify (valid/invalid/replayed); `AgentBridgeRequest` → message + `auth` + `continuationToken` across platforms; event→reply mapping; HITL→card mapping; `inputResponses` round-trip; `novuView` discovery; `novuTool` trigger; token encode/decode.
- **Integration:** mock `/v1/agents/:id/reply` + `/v1/events/trigger`; drive a fake Eve event stream; multi-platform inbound through the single route; HITL click → resume; custom action → `onAction`.
- **E2E (smoke):** `examples/` Eve agent + Novu sandbox, two connected platforms.
- Mirror `chat-adapter` test layout (`*.spec.ts` + `*.integration.spec.ts`).

## Pinned against real Eve types (`eve@0.11.6`)

- `defineChannel<TState, TCtx, …>({ state, context, routes, events, receive, fetchFile, metadata, kindHint })`. `routes` required; `events?: ChannelEvents<TCtx>`.
- **The `channel` arg to event handlers = whatever `context(state, session: SessionHandle)` returns, intersected with `ChannelSessionOps` (`{ continuationToken, setContinuationToken(token) }`).** This is exactly where `channel.thread.*` and `channel.novu.*` get injected — by returning them from the `context()` factory.
- Event handler shape: `(data, channel, ctx: SessionContext) => void | Promise<void>`; `session.failed` omits `ctx`.
- Route handlers (`POST`/`GET`/`WS` from `eve/channels`) get `RouteHandlerArgs` with `send: SendFn`, `getSession`, etc. The lower-level `RouteContext` also exposes `agent.run(RunInput)` / `agent.deliver(DeliverInput)` / `agent.getEventStream(sessionId)` and `waitUntil`.
- `defineChannel` returns an opaque `Channel`; the file path is the channel name (no `name` field). `kindHint` tags the adapter family (e.g. `slackChannel` passes `"slack"`).

### Still to verify in later impl steps

1. Exact `SendFn`/`SendOptions`/`SendPayload` and `Session`/`SessionHandle` shapes (`#channel/routes`, `#channel/session`) for the inbound `send()` call.
2. `HandleMessageStreamEvent` per-event `data` shapes (`#protocol/message`) for the reply mapping, and the `eve/client` `inputResponses` resume path for the HITL round-trip.
3. Tool sibling-export discovery for `novuView` (hook Eve's tool registration vs scan the tools dir).
4. `@vercel/connect/eve` real helper shape to back `connectNovuCredentials` on Vercel (cf. `connectSlackCredentials`).

## Implementation status (2026-06-19)

**Done + verified** (`pnpm --filter @novu/eve build` green; 32 tests pass; 3 commits on `feat/novu-eve-integration`):
- `packages/eve` scaffolded (`@novu/eve`, tsconfig, project.json, vitest.config) mirroring `chat-adapter`; `eve@0.11.6` added as dev + peer dependency; workspace install green.
- `token.ts` — continuation-token ⇄ conversation codec + tests.
- `credentials.ts` — env-first resolution + `connectNovuCredentials` + tests.
- `signature.ts` — Novu `novu-signature` HMAC verify + tests.
- `reply-client.ts` — `NovuApiClient` (`reply()` → `/v1/agents/:id/reply`, `trigger()` → `/v1/events/trigger`).
- `channel.ts` — **`novuChannel()`**: `defineChannel` with one POST webhook (verify → parse `AgentBridgeRequest` → `send()`); `context()` factory exposing `channel.thread.post` + `channel.novu.{trigger,setMetadata,resolve,reply,subscriberId}`; zero-config default delivery (`message.completed` → reply; `session.completed` → resolve).
- `tool.ts` — **`novuTool()`**: model-driven workflow trigger; pure execute + ack; recipient defaults to the conversation subscriber + tests.
- `hitl.ts` + channel wiring — **cross-platform human-in-the-loop**: render `input.requested` → Novu cards (shared Chat SDK builders); two-tier inbound round-trip (HITL click → `inputResponses` resume; custom action id → `onAction`) + tests.
- `index.ts` exports the above + re-exports the `@novu/framework` surface.

**Remaining follow-ups:**
- `views.ts` (`novuView` co-located renderer discovery), streaming (`stream:true` via `ReplyHandle`), inbound attachments (`UserContent`), freeform HITL text capture.
- `channel.integration.spec.ts` (mock reply/trigger; multi-platform single-route; HITL round-trip end-to-end) + `examples/` agent + README.

## Package shape

- New package `@novu/eve` (`packages/eve`), sibling to `@novu/chat-adapter`; `tsc` build, `vitest`, `biome`, nx `type:package`.
- **Dependency:** `@novu/framework`. **Peer dependency:** `eve`. Re-exports the `@novu/framework` surface it builds on so Eve devs need a single dependency.
