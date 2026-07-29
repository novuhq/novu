# `@novu/chat-adapter-web`

First-party web chat adapter for Novu conversational agents. Implements the Chat SDK
`Adapter` contract so browser ingress shares the same spine as Slack/email
(`InboundDispatcher` → registry → `handleWebhook`), while replies stay out-of-band
(durable Mongo activities + future WS) instead of in-request SSE.

Official `@chat-adapter/web` is intentionally **not** used — its `postMessage`/`stream`
APIs require a live HTTP request (ALS-bound SSE writer). See NV-8414 / NV-8448.

## Feature matrix

| Capability | Support |
| --- | --- |
| Inbound `handleWebhook` | Yes — inbox JWT via injected `verifySession`, ack-fast `201` |
| Outbound `postMessage` | Yes — injected `deliverMessage` (WS / live fan-out; Nest owns Mongo) |
| `editMessage` / `deleteMessage` | Yes — injected Nest callbacks (durable mutate / tombstone) |
| Reactions | `NotImplementedError` |
| `startTyping` | Documented no-op (typing rides `channel.typing` AgentEvents) |
| `stream` | Absent (SSE / `useChat` deferred to NV-8451) |
| Message history | `persistMessageHistory: false` — Mongo via `GET .../events` |
| Lock scope | `thread` |
| Resume by client `id` | Shape-validate only this ticket; full resume → NV-8441 |

## Injected callbacks

Nest owns implementations; this package stays pure (same pattern as
`@novu/chat-adapter-email` / `sendEmail`):

- `verifySession(request)` → session or `null` (401/400 before dispatch)
- `deliverMessage(...)` → `{ id, threadId }` platform delivery (**no** Mongo writes)
- `editMessage` / `deleteMessage` → durable history updates for the web UI
