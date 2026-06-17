# @chat-adapter/novu

A [Chat SDK](https://www.npmjs.com/package/chat) platform adapter that exposes **all of Novu's
normalized chat channels — Slack, WhatsApp, Microsoft Teams, Telegram, and Email — as a single
platform**. Novu does the per-channel normalization (one `Conversation` + `Subscriber` + history)
and calls your bridge; your Chat SDK app is the brain. One handler set serves every channel with no
per-channel code.

```
End-user channels ──platform webhooks──▶ NOVU (normalize) ──POST AgentBridgeRequest (HMAC)──▶
  your Chat SDK app (@chat-adapter/novu) ──AgentReplyPayload → POST /v1/agents/:id/reply──▶ NOVU ──▶ channel
```

## Install

```bash
npm install @chat-adapter/novu chat
```

`chat` is a peer dependency. `react` is an optional peer (only needed for JSX cards).

## Usage

```ts
import { Chat } from 'chat';
import { createNovuAdapter, createMemoryState, getNovuContext } from '@chat-adapter/novu';

const novu = createNovuAdapter({
  apiKey: process.env.NOVU_SECRET_KEY!,        // Authorization for reply POSTs
  agentIdentifier: 'support-agent',
  bridgeSecret: process.env.NOVU_SECRET_KEY!,  // verifies inbound HMAC
  // apiBaseUrl: 'https://eu.api.novu.co',     // defaults to https://api.novu.co
  // bridgeUrl:  'https://my-app.com/api/novu',// optional boot-time bridge registration
});

const chat = new Chat({
  userName: 'support',
  adapters: { novu },
  state: createMemoryState(), // zero-deps, single-instance; use a shared state adapter for multi-instance
});

chat.onNewMention(async (thread, message) => {
  await thread.post(`Hi! You said: ${message.text}`);
});

chat.onSubscribedMessage(async (thread, message) => {
  await thread.post(`echo: ${message.text}`);

  // Opt-in, Novu-only capabilities:
  const ctx = getNovuContext(thread);
  if (ctx.platform === 'whatsapp') {
    await ctx.trigger('escalation-email', { payload: { text: message.text } });
  }
});

await chat.initialize();
```

Wire the webhook route to `novu.handleWebhook(request)` (any Web `Request`/`Response` runtime —
Next.js route handlers, Hono, etc.).

## Behavior & v1 scope

- **In:** messages, button actions, reactions, full Novu history, subscriber identity, platform
  awareness, dedup (per `deliveryId`).
- **Out:** markdown, cards, edits (in-place), reaction adds, edit-based streaming (via the chat
  package's built-in cadence), plus opt-in `getNovuContext().trigger / setMetadata / resolve`.
- **Routing:** an ongoing conversation (`messageCount > 1` or non-empty history) is pre-subscribed →
  `onSubscribedMessage`; a brand-new conversation routes to `onNewMention` (channels) or
  `onDirectMessage` (DMs, via `platformContext.isDM`).
- **Security:** the inbound HMAC (`novu-signature`) is verified over the raw body; the reply URL is
  **derived from your config** and the request's `replyUrl` is ignored, so a forged request can never
  exfiltrate your `apiKey`.
- **Not implemented in v1:** `deleteMessage`, modals, outbound-initiated DMs (`openDM`), code-driven
  channel provisioning, Novu-side turn serialization.

## State

`createMemoryState()` is in-process and safe for a single instance. For horizontally-scaled or
serverless bridges with more than one warm instance, pass a shared state adapter
(e.g. `@chat-adapter/state-ioredis`) to `new Chat({ state })` so locks and dedup are correct.
