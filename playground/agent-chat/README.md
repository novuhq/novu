# useAgentChat playground

Minimal Next.js app for exercising headless `useAgentChat` from `@novu/react`.

## Run

```bash
# from repo root — after SDK changes
pnpm --filter @novu/js build
pnpm --filter @novu/react build

cp playground/agent-chat/.env.example playground/agent-chat/.env
# set APP_ID, SUBSCRIBER_ID, AGENT_ID (agent must expose web-chat / agent_chat)

# API needs agent web chat on
# IS_AGENT_WEB_CHAT_ENABLED=true

pnpm --filter agent-chat dev
```

Open http://localhost:4012

## Cloudflare socket (local)

To simulate cloud realtime, run the CF worker locally (not Nest `apps/ws`):

```bash
cd enterprise/workers/socket
cp .dev.vars.example .dev.vars   # if you don't already have .dev.vars
# fill JWT_SECRET + INTERNAL_API_KEY to match apps/api/src/.env
npm run dev                      # http://127.0.0.1:8787
```

Point API/worker at it (uncomment in their `.env`):

```env
SOCKET_WORKER_URL=http://127.0.0.1:8787
```

Playground already defaults to that URL with `NEXT_PUBLIC_NOVU_SOCKET_TYPE=cloud`.

## Surface under test

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

Later slices can extend `src/app/chat.tsx` in place.
