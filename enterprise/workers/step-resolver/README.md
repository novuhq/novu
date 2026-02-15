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

1. Create dispatch namespaces (one-time):

```bash
pnpm run namespace:create:staging
pnpm run namespace:create:production
```

2. Deploy worker service:

```bash
pnpm run deploy:staging
pnpm run deploy:production
```

3. Set secrets per environment:

```bash
pnpm run secret:staging
pnpm run secret:production
```

4. Deploy updates:

```bash
pnpm run deploy:staging
pnpm run deploy:production
```

If namespace names differ from your Cloudflare account, update `wrangler.jsonc`.

## Curl smoke test

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
