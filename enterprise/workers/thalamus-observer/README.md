# thalamus-observer

Cloudflare Worker + Durable Object that observes managed-agent provider streams and delivers signed webhooks to the Novu API.

Companion to `@novu/thalamus`. The API points at this Worker via `THALAMUS_CF_URL` / `THALAMUS_CF_API_KEY` / `THALAMUS_WEBHOOK_SECRET`.

## Layout

- `src/worker.ts` — HTTP routes (`/health`, `/enqueue`, `/observe`, …)
- `src/session-observer.ts` — Durable Object `SessionObserver`
- `wrangler.jsonc` — envs: `local`, `staging`, `production` (`workers.dev`)

## Local development

This package is standalone (not in the pnpm workspace). From this directory:

```bash
npm install
npm run dev
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
npm run deploy:staging
npm run deploy:production
```

Worker-bound secrets (one-time, not in CI):

```bash
npx wrangler secret put API_KEY --env staging
npx wrangler secret put API_KEY --env production
```
