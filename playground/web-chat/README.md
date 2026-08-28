# useWebChat playground

Minimal Next.js app that shows how to wire headless `useWebChat` from `@novu/react` to your own UI.

## Where to look

| File | Role |
| --- | --- |
| [`src/components/web-chat.tsx`](src/components/web-chat.tsx) | **The example.** Calls `useWebChat` and passes results into UI. |
| `src/components/chat-panel.tsx` | Composer + thread wiring (playground UI). |
| `src/app/playground.tsx` | Provider + session switching (playground shell). |

Copy the pattern in `web-chat.tsx`. Treat everything under the sidebar / debug panel as playground tooling, not part of the integration recipe.

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

## Hook surface (minimal)

| Call | Purpose |
| --- | --- |
| `useWebChat({ agentId })` | send + optimistic user messages |
| `sendMessage(text)` | user turn |
| `respondToAction(...)` | tool approval cards |
| `messages`, `pendingActions` | render thread |

See `@novu/react` docs for the full result shape.
