---
name: novu-chat-sdk
description: Integrate @novu/chat-sdk-adapter and Chat SDK into an existing project — install deps, merge the adapter into your bot, and wire NOVU_SECRET_KEY / NOVU_AGENT_IDENTIFIER from .env.local.
triggers:
  - integrate novu chat sdk
  - add novu chat sdk adapter
  - wire novu bridge route
  - connect chat sdk to novu
---

# Novu Chat SDK integration

Use this skill when a project already has `package.json` but needs the Novu bridge wired. The Novu Connect CLI has already provisioned a self-hosted bridge agent — your job is to wire the app.

## Required environment variables

Add to `.env.local` (server only — never expose on the client):

| Variable | Purpose |
|---|---|
| `NOVU_SECRET_KEY` | ApiKey auth for reply POSTs + HMAC verification |
| `NOVU_AGENT_IDENTIFIER` | Agent id from `npx novu connect` |
| `NOVU_API_BASE_URL` | Optional — only for EU/dev cloud (default `https://api.novu.co`) |

Register the bridge URL manually via `npx novu connect` (dev tunnel) or set it in the Novu dashboard — the adapter does not auto-publish on boot.

## Dependencies

```bash
npm install chat@4.30.0 @novu/chat-sdk-adapter@latest @chat-adapter/state-memory@4.30.0
```

Use `pnpm` or `yarn` if the project already does.

## Existing Chat SDK project (preferred)

When the project already has a single `new Chat({ adapters: { ... } })` bot and a Next.js `[platform]` webhook route:

1. Add `createNovuAdapter` to the **existing** `adapters` object in `lib/bot.ts` or `src/lib/bot.ts` — do **not** create a second `Chat` instance.
2. Reuse `app/api/webhooks/[platform]/route.ts` — `/api/webhooks/novu` is served automatically via `bot.webhooks.novu`.
3. Point Novu at `POST /api/webhooks/novu` via dev tunnel (`npx novu dev --route /api/webhooks/novu`) or dashboard bridge URL.

```ts
import { createNovuAdapter } from '@novu/chat-sdk-adapter';

export const bot = new Chat({
  adapters: {
    slack: createSlackAdapter(),
    novu: createNovuAdapter({
      apiKey: process.env.NOVU_SECRET_KEY!,
      agentIdentifier: process.env.NOVU_AGENT_IDENTIFIER!,
      bridgeSecret: process.env.NOVU_SECRET_KEY!,
    }),
  },
  // ...
});
```

Use `getNovuContext(thread)` in handlers for Novu-only APIs (`trigger`, `resolve`, `getSubscriber`).

## Greenfield / no existing bot

Only when there is no existing `Chat` instance:

1. Create `lib/novu/agent.ts` with `getNovuAgent()` and handlers.
2. Create `app/api/webhooks/novu/route.ts` with `POST` → `novu.handleWebhook(req)`.

## Fix duplicate bot (connect scaffolded too much)

If connect added `lib/novu/agent.ts` and `app/api/webhooks/novu/route.ts` alongside an existing `bot.ts`:

1. **Delete** `lib/novu/agent.ts` (or `src/lib/novu/agent.ts`).
2. **Delete** `app/api/webhooks/novu/route.ts` if `[platform]/route.ts` already exists.
3. Merge `createNovuAdapter` into the existing bot's `adapters` object.

## Handler routing (recommended)

- `onNewMention` — first message in a conversation (`thread.isDM` distinguishes DMs)
- `onSubscribedMessage` — all follow-ups (adapter pre-subscribes when `messageCount > 1`)
- `getNovuContext(thread)` — opt-in Novu-only APIs (`trigger`, `resolve`, `getSubscriber`)

## Verification checklist

- [ ] `.env.local` has `NOVU_SECRET_KEY` and `NOVU_AGENT_IDENTIFIER`
- [ ] Single `Chat` instance with `novu` in `adapters`
- [ ] Bridge route uses Node.js runtime (not Edge)
- [ ] Dev: `npm run dev` + `npx novu dev --route /api/webhooks/novu`
- [ ] Send a test message on a connected channel and confirm the bot replies

## Learn more

- https://github.com/novuhq/novu-chat-sdk-example
- https://docs.novu.co/agents/overview
