# @novu/chat-sdk-adapter

A [Chat SDK](https://www.npmjs.com/package/chat) platform adapter that exposes **all of Novu's
normalized chat channels — Slack, WhatsApp, Microsoft Teams, Telegram, and Email — as a single
platform**. Novu does the per-channel normalization (one `Conversation` + `Subscriber` + history)
and calls your bridge; your Chat SDK app is the brain. One handler set serves every channel with no
per-channel code.

```
End-user channels ──platform webhooks──▶ NOVU (normalize) ──POST AgentBridgeRequest (HMAC)──▶
  your Chat SDK app (@novu/chat-sdk-adapter) ──AgentReplyPayload → POST /v1/agents/:id/reply──▶ NOVU ──▶ channel
```

## Example app

For a complete Next.js boilerplate — webhook route, bridge registration, setup UI, and handler
examples — see **[novu-chat-sdk-example](https://github.com/novuhq/novu-chat-sdk-example)**.

## Install

```bash
npm install @novu/chat-sdk-adapter chat @chat-adapter/state-memory
```

`chat` is a peer dependency (`>=4.30.0`). `react` is an optional peer (only needed for JSX cards).
A `StateAdapter` is required by the Chat SDK — use the official `@chat-adapter/state-memory`
for local/single-instance, or a shared adapter (`@chat-adapter/state-redis`,
`@chat-adapter/state-ioredis`, `@chat-adapter/state-pg`) for production.

## Usage

```ts
import { Chat } from 'chat';
import { createMemoryState } from '@chat-adapter/state-memory';
import { createNovuAdapter, getNovuContext } from '@novu/chat-sdk-adapter';

const novu = createNovuAdapter({
  apiKey: process.env.NOVU_SECRET_KEY!, // Authorization for reply POSTs
  agentIdentifier: 'support-agent',
  bridgeSecret: process.env.NOVU_SECRET_KEY!, // verifies inbound HMAC
  // apiBaseUrl: 'https://eu.api.novu.co',     // defaults to https://api.novu.co
});

// Or rely on env vars — NOVU_SECRET_KEY, NOVU_AGENT_IDENTIFIER,
// NOVU_API_BASE_URL (explicit config wins):
// const novu = createNovuAdapter();

const chat = new Chat({
  userName: 'support',
  adapters: { novu },
  state: createMemoryState(), // single-instance only; use Redis/PG for horizontal scale
});

chat.onNewMention(async (thread, message) => {
  if (thread.isDM) {
    await thread.post(`Hi (DM)! You said: ${message.text}`);
  } else {
    await thread.post(`Hi! You said: ${message.text}`);
  }
});

chat.onSubscribedMessage(async (thread, message) => {
  await thread.post(`echo: ${message.text}`);

  // Opt-in, Novu-only capabilities:
  const ctx = getNovuContext(thread);

  const subscriber = await ctx.getSubscriber();
  const history = await ctx.getHistory();
  const ticketId = await ctx.getMetadata('ticketId');

  if (subscriber?.data?.plan === 'enterprise') {
    await thread.post('Priority support enabled.');
  }

  if (ctx.platform === 'whatsapp') {
    await ctx.trigger('escalation-email', { payload: { text: message.text } });
  }

  // Markdown with a file attachment:
  await thread.post({
    markdown: 'See attached report',
    files: [{ filename: 'report.txt', data: Buffer.from('...'), mimeType: 'text/plain' }],
  });

  // Portable SDK-native identity (id, name, email, avatarUrl):
  const user = await novu.getUser(message.author.userId);
});

await chat.initialize();
```

Wire the webhook route to `novu.handleWebhook(request)` (any Web `Request`/`Response` runtime —
Next.js route handlers, Hono, etc.). The adapter verifies the `novu-signature` HMAC over the raw
body; you can also call `verifyNovuSignature()` directly if you need custom middleware.

## Behavior & v1 scope

- **In:** messages, button actions, reactions, full Novu history, subscriber identity, platform
  awareness, dedup (per `deliveryId`, committed after successful dispatch).
- **Subscriber:** portable identity rides each message's `author`; `adapter.getUser(userId)` maps
  the subscriber to `UserInfo` (id/name/email/avatar); the full profile (`phone`, `locale`,
  custom `data`) is available via `getNovuContext(thread).getSubscriber()`.
- **Conversation & history:** `getConversation()` for status/metadata; `getHistory()` for the
  canonical Novu transcript (best for LLM context); `getMetadata(key)` to read conversation metadata;
  `getEmailContext()` on email threads.
- **Out:** markdown, cards, **files** (via postable `files`/`attachments`), edits (in-place),
  reaction adds, edit-based streaming (via the chat package's built-in cadence), plus opt-in
  `getNovuContext().trigger`, `setMetadata`, `deleteMetadata`, `clearMetadata`, and `resolve`.
- **Routing (recommended):** do **not** register `onDirectMessage` — use `onNewMention` for the
  first message (`thread.isDM` for DM vs channel) and `onSubscribedMessage` for all follow-ups.
  The adapter pre-subscribes when `messageCount > 1` (Novu history always includes the current
  message, so history length is not used). If you register `onDirectMessage`, Chat SDK sends
  **every** DM there and `onSubscribedMessage` never runs for DMs.
- **Security:** the inbound HMAC (`novu-signature`) is verified over the raw body; the reply URL is
  **derived from your config** and the request's `replyUrl` is ignored, so a forged request can
  never exfiltrate your `apiKey`.
- **Not implemented in v1:** `deleteMessage`, modals, outbound-initiated DMs (`openDM`), code-driven
  channel provisioning, Novu-side turn serialization.

## State

This adapter does not ship its own state layer — it relies on the Chat SDK's standard
`StateAdapter`. Use the official memory adapter `@chat-adapter/state-memory`
(`createMemoryState()`), which is in-process and safe for a single instance. For
horizontally-scaled or serverless bridges with more than one warm instance, pass a shared
state adapter (`@chat-adapter/state-redis`, `@chat-adapter/state-ioredis`, or
`@chat-adapter/state-pg`) to `new Chat({ state })` so locks and dedup are correct.
