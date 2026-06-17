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

Use this skill when a project already has `package.json` but needs the Novu bridge wired. Novu Connect has already provisioned the bridge agent and written `NOVU_SECRET_KEY` / `NOVU_AGENT_IDENTIFIER` to the project's `.env` files — do not edit those unless the user asks.

## Environment variables

Novu Connect should have already set these in `.env.local` and/or `.env`:

| Variable | Purpose |
|---|---|
| `NOVU_SECRET_KEY` | ApiKey auth for reply POSTs + HMAC verification |
| `NOVU_AGENT_IDENTIFIER` | Agent id from `npx novu connect` |
| `NOVU_API_BASE_URL` | Optional — only for EU/dev cloud (default `https://api.novu.co`) |

Do not ask the user to re-enter or duplicate these values.

## Dependencies

```bash
npm install chat@4.30.0 @novu/chat-sdk-adapter@latest @chat-adapter/state-memory@4.30.0
```

Use `pnpm` or `yarn` if the project already does.

## Existing Chat SDK project (preferred)

When the project already has a single `new Chat({ adapters: { ... } })` bot and a Next.js `[platform]` webhook route:

1. Add `createNovuAdapter` to the **existing** `adapters` object in `lib/bot.ts` or `src/lib/bot.ts` — do **not** create a second `Chat` instance.
2. Reuse `app/api/webhooks/[platform]/route.ts` — `/api/webhooks/novu` is served automatically via `bot.webhooks.novu`.
3. Add a `dev:novu` script and use it for local dev so Novu can reach the bridge:

```json
{
  "scripts": {
    "dev:novu": "npx novu dev -p 4000 --no-studio --route /api/webhooks/novu --run \"next dev --port=4000\""
  }
}
```

`npx novu dev` creates a public tunnel to localhost and registers the tunneled `POST /api/webhooks/novu` URL with Novu on start. Match `-p` and the `--run` command to this project's dev server.

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

- [ ] Single `Chat` instance with `novu` in `adapters`
- [ ] Bridge route uses Node.js runtime (not Edge)
- [ ] `dev:novu` script runs `npx novu dev --route /api/webhooks/novu --run "<dev command>"`
- [ ] `npm run dev:novu` starts the app and syncs the tunneled bridge URL to Novu
- [ ] Send a test message on a connected channel and confirm the bot replies

## Learn more

- https://github.com/novuhq/novu-chat-sdk-example
- https://docs.novu.co/agents/overview
