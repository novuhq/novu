# thalamus-observer

Cloudflare Worker + Durable Object that observes managed-agent provider streams and delivers signed webhooks to the Novu API.

Companion to `@novu/thalamus`. The API points at this Worker via `THALAMUS_CF_URL` / `THALAMUS_CF_API_KEY` / `THALAMUS_WEBHOOK_SECRET`.

## Layout

- `src/worker.ts` — HTTP routes (`/health`, `/enqueue`, `/observe`, …)
- `src/session-observer.ts` — Durable Object `SessionObserver`
- `wrangler.jsonc` — envs: `local`, `staging`, `production` (`workers.dev`)

## Local development

This package is part of the pnpm workspace (see `pnpm-workspace.yaml`).

Install dependencies from the repo root:

```bash
pnpm install
```

Run from the repo root:

```bash
pnpm dev:thalamus-observer
```

Or run directly from this folder:

```bash
pnpm run dev
```

`pnpm run dev` listens on **`http://127.0.0.1:8788`** (Wrangler `--port 8788`, not the default 8787). That leaves **8787** free for `@novu/socket-worker`.

Point the API at it:

```env
THALAMUS_CF_URL=http://127.0.0.1:8788
```

Optional `.dev.vars` for local secrets (never commit):

```bash
API_KEY=local-dev-key
```

## Deploy

Staging and production ship through the shared **Deploy to Novu Cloud** workflow (`.github/workflows/deploy.yml`), same entry point as api/worker/ws:

| Environment | How |
|-------------|-----|
| Staging | Auto on push to `next` when this path is labeled `@novu/thalamus-observer`, or run `deploy.yml` with `deploy_thalamus_observer=true` and `environment=staging` |
| Production | Manual `deploy.yml` with `deploy_thalamus_observer=true` and `environment=production-us` (or `production-us-and-eu`) |

Wrangler mapping:

- `staging` → Cloudflare env `staging` (GitHub Environment `staging-eu` secrets)
- `production-us` / `production-us-and-eu` → Cloudflare env `production` (GitHub Environment `prod-us` secrets)

Required secrets on those GitHub Environments: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Emergency local deploy (break-glass):

```bash
pnpm run deploy:staging
pnpm run deploy:production
```

Worker-bound secrets (one-time, not in CI):

```bash
pnpm exec wrangler secret put API_KEY --env staging
pnpm exec wrangler secret put API_KEY --env production
```
