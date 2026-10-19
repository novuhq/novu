# @novu/socket-worker

Cloudflare Worker + Durable Object for Novu Cloud WebSockets (PartySocket).

## Local development

This package is part of the pnpm workspace (see `pnpm-workspace.yaml`).

Install dependencies from the repo root:

```bash
pnpm install
```

Run from the repo root:

```bash
pnpm dev:socket-worker
```

Or run directly from this folder:

```bash
pnpm run dev
```

`pnpm run dev` runs `wrangler dev --env local` on **`http://127.0.0.1:8787`**.

Local `thalamus-observer` uses **8788** so both workers can run at once; keep socket on 8787.

First-time setup in this folder:

```bash
cp .dev.vars.example .dev.vars
# Fill JWT_SECRET and INTERNAL_API_KEY from apps/api/src/.env
# (INTERNAL_API_KEY must match INTERNAL_SERVICES_API_KEY)
```

`.dev.vars` is gitignored. The `local` wrangler env sets `API_URL` to `http://127.0.0.1:3000`.

### Wire API / worker / playground

In `apps/api/src/.env` and `apps/worker/src/.env`:

```env
SOCKET_WORKER_URL=http://127.0.0.1:8787
```

Keep `NOVU_ENTERPRISE=true` and the same `INTERNAL_SERVICES_API_KEY` as `.dev.vars` `INTERNAL_API_KEY`. Locally, Cloudflare sockets are the realtime path.

Playground (`playground/web-chat`):

```env
NEXT_PUBLIC_NOVU_SOCKET_URL=http://127.0.0.1:8787
NEXT_PUBLIC_NOVU_SOCKET_TYPE=cloud
```
