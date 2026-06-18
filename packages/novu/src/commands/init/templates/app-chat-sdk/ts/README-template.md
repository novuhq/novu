# Novu Chat SDK Starter

A Next.js boilerplate for building multi-channel chat bots with [Chat SDK](https://github.com/vercel-labs/chat) and [`@novu/chat-sdk-adapter`](https://www.npmjs.com/package/@novu/chat-sdk-adapter).

## Quick start

```bash
npm install
npm run dev:novu
```

Open http://localhost:4005 and connect a channel with `npx novu connect --runtime chat-sdk`.

## Environment

`.env.local` is written by `npx novu connect` or `npx novu init --template chat-sdk`:

- `NOVU_SECRET_KEY`
- `NOVU_AGENT_IDENTIFIER`
- `NOVU_API_BASE_URL` (optional, for EU/dev cloud)

## Bridge route

`POST /api/webhooks/novu` — Novu POSTs signed bridge requests here.

## Bot commands

| Message | Behavior |
| --- | --- |
| any text | Echo with platform name |
| `whoami` | Show subscriber + user info |
| `resolve` | Resolve the conversation in Novu |

## Learn more

- https://docs.novu.co/agents/overview
- https://github.com/novuhq/novu-chat-sdk-example
