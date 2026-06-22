# Step Resolver Dispatch Worker

Cloudflare Workers for Platforms dispatch worker for Step Resolver resolution.

## Repository structure

```text
enterprise/workers/step-resolver/
  src/index.ts                # HTTP routes + dispatch logic
  src/auth/hmac.ts            # request signature validation
  src/utils/worker-id.ts      # worker id mapping
  wrangler.jsonc              # worker + namespace config
```

This package is part of the pnpm workspace via `enterprise/workers/*`.

## What the worker does

- Exposes a public dispatch endpoint for resolving step output.
- Validates HMAC auth header (`X-Novu-Signature` in format `t={timestamp},v1={hmac}`).
- Maps tenant worker id as `sr-${organizationId}-${stepResolverHash}`.
- Dispatches into a Workers for Platforms namespace (`DISPATCHER` binding).
- Preserves downstream response status/body and adds `x-request-id`.

## API contract

### `GET /health`

- Returns `200` with JSON status payload.
- Any method other than `GET` returns `405`.

### `POST /resolve/:organizationId/:stepResolverHash/:stepId`

Route validation (strict):

- `organizationId`: lowercase hex, exactly 24 chars (`[a-f0-9]{24}`)
- `stepResolverHash`: format `sr-xxxxx-xxxxx` (e.g., `sr-abc12-def34`)
- `stepId`: one URL path segment (`[^/]+`)
- `Content-Type`: must be `application/json`
- Body size: max `1MB`

Auth headers:

- `X-Novu-Signature`: Signature header in format `t={timestamp},v1={hmac}`

On success, request is forwarded as:

- method: `POST`
- path: original `/resolve/...` path
- query param: `step=<decoded stepId>`
- stripped headers before forwarding: `x-novu-signature`, `authorization`, `x-internal-auth`

## HMAC signing format

Uses the same signature format as `@novu/framework` Bridge authentication, but with a **different secret** for different trust boundaries:

- **Framework Bridge**: Uses per-customer `NOVU_SECRET_KEY` to authenticate Novu Cloud → Customer's Bridge Endpoint
- **Step Resolver Worker**: Uses platform-level `STEP_RESOLVER_HMAC_SECRET` to authenticate Novu API → Novu's Cloudflare Workers

This separation ensures customer secrets protect their infrastructure while platform secrets protect Novu's worker infrastructure, without requiring per-customer secret lookups in workers.

Signature format:

```text
X-Novu-Signature: t={timestamp},v1={hmac}
```

HMAC computed over:

```text
${timestamp}.${rawRequestBody}
```

Note: The HMAC is computed over the raw request body bytes (UTF-8 decoded string), not a re-serialized JSON object. This ensures canonical validation against the exact bytes received.

Validation notes:

- allowed clock skew: `300` seconds (5 minutes)
- signature comparison is constant-time
- replay protection is timestamp-window only (no nonce store)

### Node signing example

```ts
import { createHmac } from 'node:crypto';

const secret = process.env.STEP_RESOLVER_HMAC_SECRET!;
const payload = {
  payload: { firstName: 'Ada' },
  subscriber: { email: 'ada@example.com' },
  context: {},
  steps: {},
};

const timestamp = Date.now();
const bodyString = JSON.stringify(payload);
const data = `${timestamp}.${bodyString}`;
const hmac = createHmac('sha256', secret).update(data).digest('hex');
const signature = `t=${timestamp},v1=${hmac}`;

// Send as headers:
// X-Novu-Signature: t=1234567890,v1=abc123...
// Body: <bodyString> (same string used in HMAC computation)
```

## Local development

Install dependencies from repo root:

```bash
pnpm install
```

Run with workspace filter from repo root:

```bash
pnpm --filter @novu/step-resolver-worker dev
```

Or run directly from this folder:

```bash
pnpm run dev
```

For local `wrangler dev`, provide the secret (for example via `.dev.vars`):

```bash
STEP_RESOLVER_HMAC_SECRET=local-dev-secret
```

## Cloudflare setup and deploy

From `enterprise/workers/step-resolver`:

### Environments

| Wrangler env | Domain | Dispatch namespace |
|--------------|--------|--------------------|
| `staging` | `*.workers.dev` | `novu-step-resolvers-staging` |
| `production` (US) | `step-resolver.novu.co` | `novu-step-resolvers-production` |
| `production-eu` | `eu.step-resolver.novu.co` | `novu-step-resolvers-production-eu` |

EU follows the same multi-region pattern as `@novu/socket-worker`: separate wrangler env, custom domain, and dispatch namespace in the same Cloudflare account. US (`production`) is unchanged.

EU compute residency uses two Cloudflare mechanisms:

- **Regional Services** (Data Localization Suite): pins TLS termination and dispatch worker execution to EU for `eu.step-resolver.novu.co`.
- **Placement hints**: `production-eu` wrangler env and tenant worker deploy metadata target `aws:eu-central-1`.

### One-time setup

1. Create dispatch namespaces:

```bash
pnpm run namespace:create:staging
pnpm run namespace:create:production
pnpm run namespace:create:production-eu
```

1. Add the `eu.step-resolver.novu.co` custom domain in the Cloudflare dashboard (same account as US).

1. Enable Regional Services for the EU hostname (requires Data Localization Suite on the account):

```bash
export CLOUDFLARE_ZONE_ID="<novu.co zone id>"
export STEP_RESOLVER_CF_API_TOKEN="<token with Zone:Edit + DLS permissions>"
pnpm run regional-services:production-eu
```

1. Deploy dispatch workers:

```bash
pnpm run deploy:staging
pnpm run deploy:production
pnpm run deploy:production-eu
```

1. Set HMAC secrets per environment (must match the corresponding API/worker stack):

```bash
pnpm run secret:staging
pnpm run secret:production
pnpm run secret:production-eu
```

### Deploy updates

```bash
pnpm run deploy:staging
pnpm run deploy:production
pnpm run deploy:production-eu
```

If namespace names differ from your Cloudflare account, update `wrangler.jsonc`.

### EU API/worker stack env vars

The EU `apps/api` and `apps/worker` stacks (GitHub environment `production-eu`, Secrets Manager) must set region-specific values. No code changes are required — the same env keys are used; only values differ per region.

| Variable | US (`production` wrangler / `production-us` ECS) | EU (`production-eu`) |
|----------|--------------------------------------------------|----------------------|
| `STEP_RESOLVER_DISPATCH_URL` | `https://step-resolver.novu.co` | `https://eu.step-resolver.novu.co` |
| `STEP_RESOLVER_CF_DISPATCH_NAMESPACE` | `novu-step-resolvers-production` | `novu-step-resolvers-production-eu` |
| `STEP_RESOLVER_CF_ACCOUNT_ID` | Cloudflare account ID | Same account ID |
| `STEP_RESOLVER_CF_API_TOKEN` | CF API token | CF API token (scoped to EU namespace if possible) |
| `STEP_RESOLVER_CF_PLACEMENT_REGION` | *(unset)* | `aws:eu-central-1` |
| `STEP_RESOLVER_HMAC_SECRET` | US dispatch worker secret | EU dispatch worker secret (from `secret:production-eu`) |

`STEP_RESOLVER_CF_PLACEMENT_REGION` is passed as tenant worker `placement.region` metadata on deploy. Use `provider:region` format (e.g. `aws:eu-central-1`). Set it only on the EU API stack so customer code steps are placed near EU infrastructure. Leave unset on US.

`apps/api` uses all six deploy/runtime variables above. `apps/worker` uses `STEP_RESOLVER_DISPATCH_URL` and `STEP_RESOLVER_HMAC_SECRET` (runtime only).

### LaunchDarkly feature flags

Step resolver is gated by `IS_STEP_RESOLVER_ENABLED` and `IS_ACTION_STEP_RESOLVER_ENABLED`. The API already sends `region` context from `NOVU_REGION` to LaunchDarkly. Extend existing US targeting to include `region = eu` before enabling step resolver for EU customers.

### Verification

After EU rollout:

1. From an EU org dev environment, publish a code step (`novu step publish --api-url https://eu.api.novu.co`).
2. Confirm the tenant script is created in the `novu-step-resolvers-production-eu` namespace (Cloudflare dashboard).
3. Trigger a workflow preview/run and confirm resolution hits `https://eu.step-resolver.novu.co` with a valid HMAC.

## Curl smoke test

US production:

```bash
DISPATCH_URL="https://step-resolver.novu.co"
```

EU production:

```bash
DISPATCH_URL="https://eu.step-resolver.novu.co"
```

Staging:

```bash
DISPATCH_URL="https://step-resolver-dispatch-staging.<subdomain>.workers.dev"
ORGANIZATION_ID="696a21b632ef1f83460d584d"
STEP_RESOLVER_HASH="abc12-def34"
STEP_ID="welcome-email"
SECRET="${STEP_RESOLVER_HMAC_SECRET:?set STEP_RESOLVER_HMAC_SECRET}"

PATHNAME="/resolve/${ORGANIZATION_ID}/sr-${STEP_RESOLVER_HASH}/${STEP_ID}"
BODY='{"payload":{"firstName":"Ada"},"subscriber":{"email":"ada@example.com"},"context":{},"steps":{}}'

# Create HMAC signature using Framework format
TIMESTAMP="$(node -e 'console.log(Date.now())')"
DATA="${TIMESTAMP}.${BODY}"
HMAC="$(printf '%s' "$DATA" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')"
SIGNATURE="t=${TIMESTAMP},v1=${HMAC}"

curl -i -X POST "${DISPATCH_URL}${PATHNAME}" \
  -H "Content-Type: application/json" \
  -H "X-Novu-Signature: ${SIGNATURE}" \
  -d "$BODY"
```

Set `DISPATCH_URL` to the US, EU, or staging endpoint above before running.
