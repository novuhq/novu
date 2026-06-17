---
name: novu-chat-sdk
description: Integrate @novu/chat-sdk-adapter and Chat SDK into an existing project — install deps, add the bridge route, and wire NOVU_SECRET_KEY / NOVU_AGENT_IDENTIFIER from .env.local.
triggers:
  - integrate novu chat sdk
  - add novu chat sdk adapter
  - wire novu bridge route
  - connect chat sdk to novu
---

# Novu Chat SDK integration

Use this skill when a project already has `package.json` but no `@novu/chat-sdk-adapter` yet. The Novu Connect CLI has already provisioned a self-hosted bridge agent — your job is to wire the app.

## Required environment variables

Add to `.env.local` (server only — never expose on the client):

| Variable | Purpose |
|---|---|
| `NOVU_SECRET_KEY` | ApiKey auth for reply POSTs + HMAC verification |
| `NOVU_AGENT_IDENTIFIER` | Agent id from `npx novu connect` |
| `NOVU_API_BASE_URL` | Optional — only for EU/dev cloud (default `https://api.novu.co`) |
| `NOVU_BRIDGE_URL` | Optional — production deploy URL ending in your bridge route |

## Dependencies

```bash
npm install chat@4.30.0 @novu/chat-sdk-adapter@latest @chat-adapter/state-memory@4.30.0
```

Use `pnpm` or `yarn` if the project already does.

## Next.js App Router pattern

1. Create `lib/novu/agent.ts` with `getNovuAgent()`:
   - `createNovuAdapter({ apiKey, agentIdentifier, bridgeSecret: apiKey })`
   - `new Chat({ adapters: { novu }, state: createMemoryState() })`
   - Register handlers with `onNewMention` + `onSubscribedMessage` (do **not** register `onDirectMessage`)
2. Create `app/api/webhooks/novu/route.ts`:
   - `export const runtime = 'nodejs'`
   - `POST` → `return novu.handleWebhook(req)`
   - `GET` → return `{ ok: true, configured }` for local status checks
3. Point Novu at `POST /api/webhooks/novu` via dev tunnel or production `NOVU_BRIDGE_URL`.

## Handler routing (recommended)

- `onNewMention` — first message in a conversation (`thread.isDM` distinguishes DMs)
- `onSubscribedMessage` — all follow-ups (adapter pre-subscribes when `messageCount > 1`)
- `getNovuContext(thread)` — opt-in Novu-only APIs (`trigger`, `resolve`, `getSubscriber`)

## Verification checklist

- [ ] `.env.local` has `NOVU_SECRET_KEY` and `NOVU_AGENT_IDENTIFIER`
- [ ] Bridge route uses Node.js runtime (not Edge)
- [ ] `await chat.initialize()` runs before handling webhooks
- [ ] Dev: `npm run dev` on port 4000 + `npx novu dev --route /api/webhooks/novu`
- [ ] Send a test message on a connected channel and confirm the bot replies

## Learn more

- https://github.com/novuhq/novu-chat-sdk-example
- https://docs.novu.co/agents/overview
