# useWebChat playground

Minimal Next.js app that wires headless `useWebChat` from `@novu/react` to an assistant-ui Thread (`ExternalStoreRuntime`).

## Where to look

| File | Role |
| --- | --- |
| [`src/components/web-chat.tsx`](src/components/web-chat.tsx) | **The example.** Calls `useWebChat`; optional `onEvent` banner for `run-error`. |
| [`src/components/chat-panel.tsx`](src/components/chat-panel.tsx) | Recovery UI: `isRecovering` status + `catchUpError` with `refetch` retry (separate from send `error`). |
| `src/components/assistant-ui/web-chat-runtime.tsx` | ExternalStoreRuntime wiring (`onNew`, `onRespondToToolApproval`). |
| `src/lib/agent-message-to-thread-message.ts` | AgentMessage → ThreadMessageLike converter. User rows use `idempotencyKey ?? id` so assistant-ui identity stays stable when Novu swaps `opt_*` → `msg_*`; actual Novu `message.id` lives in `metadata.custom.novuMessageId` for retry. No unit test here — this package has no test runner (only `dev` / `build` / `start`); identity mapping is covered in `packages/js/src/web-chat/web-chat.test.ts`. |
| `src/components/assistant-ui/novu-parts.tsx` | Novu data UI (card, MCP, file) + approval tool fallback. |
| `src/components/assistant-ui/elements/thread.aui.tsx` | Official assistant-ui registry Thread (turn-anchor, grouped parts). |
| `src/components/assistant-ui/thread.tsx` | Novu adapter: slot overrides, pagination scroll preservation, typing. |
| `src/app/playground.tsx` | Provider + session switching (playground shell). |

Copy the hook wiring in `web-chat.tsx`. Treat the sidebar / debug panel as playground tooling.

**Public recovery:** After reconnect, `isRecovering` shows a non-blocking “Syncing missed messages…” banner. If catch-up fails, `catchUpError` appears with a **Reload conversation** button that calls `refetch()` — this is separate from the session `error` banner.

**MCP connect:** Pending MCP cards open `authorizeUrlWithAutoApprove` when the server provides it (auto-approve OAuth path), otherwise `authorizeUrl`. No SDK action exists for connect; the browser link is the supported path.

## Run locally

```bash
cp playground/web-chat/.env.example playground/web-chat/.env
# set APP_ID, SUBSCRIBER_ID, AGENT_ID (agent must expose web_chat)
```

From the repo root:

```bash
pnpm --filter web-chat dev
```

Open http://localhost:4012.
