# Keyless Inbox sample

Minimal [Vite](https://vite.dev/) + React app to verify [Inbox keyless mode](https://docs.novu.co/platform/inbox/setup-inbox#try-inbox-in-keyless-mode).

## What it does

Renders the Inbox with no configuration:

```tsx
import { Inbox } from '@novu/react';

export function App() {
  return <Inbox />;
}
```

Novu creates a temporary demo environment on first session. Data expires in about 24 hours and is not tied to real subscribers.

## Run against Novu cloud (fastest)

From the monorepo root:

```bash
pnpm install
cd playground/keyless-inbox
pnpm dev
```

Open http://localhost:5175 and click the notification bell. Use the inbox footer actions to trigger a demo notification.

## Run against local API (enterprise only)

Keyless environment creation is an enterprise feature. The community API returns an error unless `NOVU_ENTERPRISE=true` and keyless org/user env vars are configured.

If your local stack supports keyless:

1. Start API (`:3000`), worker, and WS (`:3002`).
2. Copy `.env.example` to `.env`.
3. `pnpm dev` and open http://localhost:5175

## Clear keyless state

Keyless `applicationIdentifier` is stored in `localStorage` under `novu_keyless_application_identifier`. Clear site data or remove that key to start a fresh demo environment.
