# `@novu/chat-adapter-web`

First-party web chat adapter for Novu conversational agents. Implements the Chat SDK
`Adapter` contract so browser ingress shares the same spine as Slack/email
(`InboundDispatcher` → registry → `handleWebhook`), while replies stay out-of-band
(durable Mongo activities + adapter-owned live WS) instead of in-request SSE.

Official `@chat-adapter/web` is intentionally **not** used — its `postMessage`/`stream`
APIs require a live HTTP request (ALS-bound SSE writer). See NV-8414 / NV-8448.

## Feature matrix

| Capability | Support |
| --- | --- |
| Inbound `handleWebhook` | Yes — inbox JWT via `verifySession`; awaits `provisionInbound` then `201` |
| Outbound `postMessage` | Yes — injected `deliverMessage` (WS / live fan-out; Nest owns Mongo) |
| `editMessage` / `deleteMessage` | Yes — injected Nest callbacks (live fan-out; Nest owns durable ledger) |
| Reactions | `NotImplementedError` |
| `startTyping` | Yes — injected Nest callback (ephemeral `channel.typing` envelope) |
| `stream` | Absent (SSE / `useChat` deferred to NV-8451) |
| Message history | `persistMessageHistory: false` — Mongo via `GET .../events` |
| Lock scope | `thread` |
| Event context | `withEventContext(envelope, op)` — concurrency-safe ALS for source envelopes |
| Resume by client `id` / `conversationIdentifier` | Yes — Nest `authorizeResume` ACL (NV-8441) |
| Client `messageId` idempotency | Deferred (minting a server message id avoids ghost acks on retries) |

## Injected callbacks

Nest owns implementations; this package stays pure (same pattern as
`@novu/chat-adapter-email` / `sendEmail`):

- `verifySession(request)` → session or `null` (401/400 before dispatch)
- `authorizeResume({ conversationId, session })` → ACL for resume
- `provisionInbound(...)` → awaited before `201` (conversation + participant + user activity)
- `deliverMessage(...)` → `{ id, threadId, sequence? }` platform delivery (**no** Mongo writes)
- `editMessage` / `deleteMessage` → live fan-out only (Nest appends durable EDIT/DELETE ledger)
- `startTyping(...)` → live ephemeral typing envelope
- Source envelopes reach callbacks via `withEventContext` + `NovuWebChatAdapterImpl.getEventContext()`
