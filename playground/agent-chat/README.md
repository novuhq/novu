# useAgentChat playground

Minimal Next.js app that shows how to wire headless `useAgentChat` from `@novu/react` to your own UI.

## Read this first

| File | Role |
| --- | --- |
| [`src/components/agent-chat.tsx`](src/components/agent-chat.tsx) | **The example.** Calls `useAgentChat` and passes results into UI. |
| [`src/components/chat-panel.tsx`](src/components/chat-panel.tsx) | Stand-in UI. Swap for your components. |
| [`src/app/playground.tsx`](src/app/playground.tsx) | Playground shell: `NovuProvider`, session switching, debug tools. |

Copy the pattern in `agent-chat.tsx`. Treat everything under the sidebar / debug panel as playground tooling, not part of the integration recipe.

## Run

```bash
# from repo root — after SDK changes
pnpm --filter @novu/js build
pnpm --filter @novu/react build

cp playground/agent-chat/.env.example playground/agent-chat/.env
# set APP_ID, SUBSCRIBER_ID, AGENT_ID (agent must expose agent_chat)

# API needs agent chat on
# IS_AGENT_WEB_CHAT_ENABLED=true

pnpm --filter agent-chat dev
```

Open http://localhost:4012

## Cloudflare socket (local)

To simulate cloud realtime, run the CF worker locally (not Nest `apps/ws`):

```bash
# from repo root (after pnpm install)
cp enterprise/workers/socket/.dev.vars.example enterprise/workers/socket/.dev.vars
# fill JWT_SECRET + INTERNAL_API_KEY to match apps/api/src/.env
pnpm dev:socket-worker              # http://127.0.0.1:8787
```

Point API/worker at it (uncomment in their `.env`):

```env
SOCKET_WORKER_URL=http://127.0.0.1:8787
```

Playground already defaults to that URL with `NEXT_PUBLIC_NOVU_SOCKET_TYPE=cloud`.

## Hook surface under test

| Hook | Behavior today |
| --- | --- |
| `useAgentChat({ agentId })` | send + optimistic user messages |
| `conversationId` | adopted after first successful send |
| `isRunning` | durable run state: live `run-start` / `run-finish` / `run-error`, replayed from history on mount |
| `status` | `active` or `resolved` conversation lifecycle |
| `onEvent` | raw live envelopes; `src/lib/run-activity.ts` keeps the last run transition |
| `error` | last send failure |

## Check run status survives a reload

The sidebar `Run` pill reads `running · restored` when the run state came from history
replay instead of a live `run-start`, so the two paths stay distinguishable.

The playground keeps the conversation id in memory only, so remount it explicitly:

1. Send a message that keeps the agent busy for a few seconds, then copy the `Conversation` id
2. While the pill still says `running`, reload the page and paste the id into `Resume by ID`
3. Pill shows `running · restored`, and the composer stays disabled until `run-finish` arrives
