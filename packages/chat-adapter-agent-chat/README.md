# `@novu/chat-adapter-agent-chat`

First-party agent chat adapter for Novu conversational agents. Implements the Chat SDK
`Adapter` contract so browser ingress shares the same spine as Slack/email
(`InboundDispatcher` → registry → `handleWebhook`), while replies stay out-of-band
(durable Mongo activities + adapter-owned live WS) instead of in-request SSE.

Official `@chat-adapter/web` is intentionally **not** used — its `postMessage`/`stream`
APIs require a live HTTP request (ALS-bound SSE writer). See NV-8414 / NV-8448.

Plan limits use the shared inbound-turn `PlanLimitGateService` (same as other channels).

## Feature matrix

| Capability | Support |
| --- | --- |
| Inbound `handleWebhook` | Yes — inbox JWT via `verifySession`; `processMessage` then `201` |
| Outbound `postMessage` | Yes — injected `deliverMessage` (Nest: persist then best-effort live WS) |
| `editMessage` / `deleteMessage` | Yes — injected Nest callbacks (persist ledger then live fan-out) |
| Reactions | `NotImplementedError` |
| `startTyping` | Yes — injected Nest callback (ephemeral `channel.typing` envelope) |
| `stream` | Absent (SSE / `useChat` deferred to NV-8451) |
| Message history | `persistMessageHistory: false` — Mongo via `GET .../events` |
| Lock scope | `thread` |
| Client message ids | `supportsClientMessageIds` — caller's `messageId` on the postable message is forwarded to `deliverMessage` |
| Resume by client `id` / `conversationIdentifier` | Yes — Nest `authorizeResume` ACL (NV-8441) |

## Injected callbacks

Nest owns implementations; this package stays pure (same pattern as
`@novu/chat-adapter-email` / `sendEmail`):

- `verifySession(request)` → session or `null` (401/400 before dispatch)
- `authorizeResume({ conversationId, session })` → ACL for resume
- `deliverMessage({ threadId, content, messageId?, ... })` → `{ id, threadId }` (Nest emits live WS; delivery facts flow back through the Nest-side `OutboundDeliveryInfo` collector, not this package)
- `editMessage` / `deleteMessage` → same: live fan-out, durable persist stays in Nest
- `startTyping(...)` → live ephemeral typing envelope (no persist)
