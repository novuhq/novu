---
name: add-channel-connect-button
description: >-
  Build a new channel Connect button (e.g. WhatsApp, Discord, LINE) in @novu/js
  and @novu/react following the existing SlackConnectButton, MsTeamsConnectButton,
  and TelegramConnectButton pattern. Use when adding connect/disconnect UI for a
  new chat channel/provider to the SDK — covering the SolidJS core component, the
  React wrapper, the channelConnections (OAuth) vs channelEndpoints (deep-link)
  data layer, the component registry, and package exports.
---

# Add a Channel Connect Button

Build `<Channel>ConnectButton` for a new chat provider, mirroring `Slack`, `MsTeams`,
and `Telegram`. The button lets a subscriber connect (open OAuth popup / deep link)
and disconnect a channel, with loading + connected states.

## Architecture (3 layers)

```
packages/js (SolidJS core)          packages/react (public wrapper)
─────────────────────────           ──────────────────────────────
<Channel>ConnectButton.tsx   ◄────  Default<Channel>ConnectButton.tsx  (Mounter → mountComponent)
  uses a data hook                  <Channel>ConnectButton.tsx          (memo → NovuUI → withRenderer)
  calls novu.channel*  SDK
registered in Renderer.tsx
```

The React component mounts the SolidJS component by **name** through `novuUI.mountComponent`.
That name must be registered in `packages/js/src/ui/components/Renderer.tsx`.

## Step 0 — Pick the connection model (do this first)

This single decision drives which SDK module, hook, and props you use.

| | Connection-based — like **Slack, MS Teams** | Endpoint-based — like **Telegram** |
|---|---|---|
| Use when | Provider authorizes at **workspace/tenant** level via OAuth | Subscriber links by opening a **deep link**; no workspace auth |
| SDK module | `novu.channelConnections` | `novu.channelEndpoints` |
| Connect call | `generateConnectOAuthUrl()` → OAuth popup URL | `link({ integrationIdentifier })` → deep-link URL |
| Detect / poll | `get(connectionIdentifier)` | `list({ providerId, integrationIdentifier, limit: 1 })` |
| Data hook | reuse `useChannelConnection` | new `use<Channel>Connection` (list-based, copy `useTelegramConnection`) |
| Extra props | `connectionIdentifier`, `context`, `scope`, `connectionMode`, `autoLinkUser` | none beyond the base props |
| Identifier | `buildDefaultConnectionIdentifier(...)` from `components/constants.ts` | not needed |

If unsure: OAuth/app-install provider → **connection-based**; bot deep-link/token provider → **endpoint-based**.

## File checklist

Copy the nearest sibling for your model (Slack/MS Teams = connection, Telegram = endpoint),
then rename. Full templates: see [reference.md](reference.md).

**Core — `packages/js`**
- [ ] CREATE `src/ui/icons/<Channel>Colored.tsx` — brand icon (copy `TelegramColored.tsx`)
- [ ] CREATE `src/ui/components/<channel>-connect-button/<Channel>ConnectButton.tsx`
- [ ] CREATE *(endpoint model only)* `src/ui/api/hooks/use<Channel>Connection.ts`
- [ ] EDIT `src/ui/components/Renderer.tsx` — import it, add to `novuComponents`, add the name string to `CHANNEL_COMPONENTS`
- [ ] EDIT `src/ui/components/index.ts` — `export * from './<channel>-connect-button/<Channel>ConnectButton'`
- [ ] EDIT `src/ui/index.ts` — re-export `<Channel>ConnectButtonProps` in the type block

**React — `packages/react`**
- [ ] CREATE `src/components/<channel>-connect-button/Default<Channel>ConnectButton.tsx`
- [ ] CREATE `src/components/<channel>-connect-button/<Channel>ConnectButton.tsx`
- [ ] EDIT `src/components/index.ts` — `export * from './<channel>-connect-button/<Channel>ConnectButton'`
- [ ] EDIT `src/index.ts` — add the component to the value export block and `<Channel>ConnectButtonProps` to the type block

**Usually NOT needed**
- The `channelConnections` / `channelEndpoints` SDK modules already cover both models. Only add a new method under `packages/js/src/channel-*` if the provider needs a brand-new server call (rare). Backend lives in `apps/api/src/app/channel-connections/`.
- Never edit `libs/internal-sdk` (auto-generated).

## Button behavior contract

Every connect button implements the same state machine — keep it identical:

- **Initial load**: `<Show when={!loading()} fallback={<Loader/>}>`; derive `isConnected()` from the hook's connection/endpoint, and `isLoading() = loading() || actionLoading()`.
- **Click when connected** → `disconnect(identifier)` → `onDisconnectSuccess()` / `onDisconnectError(err)`.
- **Click when not connected** → `setActionLoading(true)`, get the URL, `window.open(url, '_blank', 'noopener,noreferrer')`, then start polling.
- **Polling** → fixed interval (`2500ms`, `120_000ms` timeout) or backoff (see MS Teams). Use a one-shot `committed` flag / ref so only the **first** success-or-timeout fires side effects. Clear the timer in `onCleanup`.
- **Resolve** → success: `mutate(found)` + `onConnectSuccess(identifier)`; timeout: `onConnectError(new Error(...))`.
- **Appearance** → reuse the shared keys `channelConnectButtonContainer | Button | Inner | Icon | Label`, each passed `{ connected }` context. Icons go through `IconRendererWrapper` (keys `channelConnect` / `channelConnected`) with a fallback to `<Channel>Colored` / `CheckCircleFill`. **Do not add new appearance keys** — they are shared across all connect buttons.
- **Base props** → `integrationIdentifier` (required), `subscriberId?`, `onConnectSuccess?`, `onConnectError?`, `onDisconnectSuccess?`, `onDisconnectError?`, `connectLabel?`, `connectedLabel?`.

## Conventions & gotchas

- The **core is SolidJS, not React**: signals over hooks, `<Show>` over ternaries, read props lazily (`() => props.x`), cleanup via `onCleanup`. The React layer is just a mounting shim.
- The `name` in `mountComponent({ name: '<Channel>ConnectButton' })` **must** equal the key in `novuComponents` and be listed in `CHANNEL_COMPONENTS`, or it renders through the wrong path.
- `<Channel>ConnectButtonProps` is defined in the core and imported by React from `@novu/js/ui` — do not redefine it.
- Novu conventions: lowercase-dashed dirs, named exports, blank line before every `return`, no nested ternaries.
- These packages are published — new exports are a **minor** bump; keep prop changes additive/backward-compatible.

## Build & verify

1. `pnpm build` (required after changing `packages/`).
2. Type-check + lint the touched files.
3. Manual test: add a page/tab in `playground/nextjs` (copy `src/components/telegram-end-user-connect.tsx`) that wraps `<Channel>ConnectButton` in `<NovuProvider>`, then connect/disconnect against a real integration.
