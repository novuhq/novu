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

**Staging and production are deployed by GitHub Actions** (do not rely on laptop Wrangler for Cloud envs):

| Environment | How |
|-------------|-----|
| Staging | Auto on push to `next` when this directory changes, or run **Deploy Cloudflare Workers (Staging)** |
| Production | Manual **Deploy Cloudflare Workers (Production)** workflow only |

Workflows:

- `.github/workflows/deploy-cf-workers-staging.yml`
- `.github/workflows/deploy-cf-workers-production.yml`
- `.github/workflows/reusable-cf-worker-deploy.yml`

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
