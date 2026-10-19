# Production & Security

The Bridge Endpoint is a public HTTP route, so Novu Framework includes builtin protections to ensure only Novu Cloud can invoke it.

## HMAC Authentication

Each request from Novu Cloud to your Bridge includes a `Novu-Signature` header containing a timestamp and a signature. The Framework's `serve` wrapper verifies the signature against `NOVU_SECRET_KEY` before invoking your workflow handler.

### Header format

```
Novu-Signature: t=<timestamp>,v1=<signature>
```

- `t=<unix_seconds>` — when the request was signed
- `v1=<sha256_signature>` — current valid signature scheme (more may come; always begin with `v`)

### When is HMAC enforced?

| `NODE_ENV` | HMAC verification |
| --- | --- |
| `development` | **Disabled** — required for the Studio to reach your local bridge |
| anything else (incl. `production`, `staging`, undefined) | **Enabled** |

You don't write any verification code — `serve()` handles it.

### Override behavior

```typescript
import { Client as NovuFrameworkClient } from "@novu/framework";
import { serve } from "@novu/framework/next";

export const { GET, POST, OPTIONS } = serve({
  client: new NovuFrameworkClient({
    secretKey: process.env.NOVU_SECRET_KEY,
    strictAuthentication: false, // Disables HMAC — DEV ONLY
  }),
  workflows: [/* … */],
});
```

> **Never disable `strictAuthentication` in production.** Without HMAC, anyone who can reach your bridge URL can trigger arbitrary step resolution and exfiltrate subscriber/payload data.

## Network Requirements

- **Public HTTPS** — your bridge must be reachable from the public internet.
- **No IP allowlist published** — Novu Cloud workers autoscale; we don't expose stable IPs.
- **No auth middleware on `/api/novu`** — Novu authenticates with HMAC, not with your app's JWT/session.

If you need to harden the perimeter:

- Place a WAF in front, but **allow** traffic to `/api/novu` (or whatever path you mounted).
- Use rate limiting per HMAC header (each request includes a recent timestamp).
- Log and alert on signature failures — they may indicate a misconfigured bridge URL or a hostile actor.

## Compliance

Novu Cloud workers are:

- **GDPR** compliant
- **SOC 2 Type II** certified
- **ISO 27001** certified

Bridge requests carry only the data necessary to resolve a step: subscriber id (and any subscriber attributes you reference), payload (which you defined the schema for), and step controls. No additional telemetry is exfiltrated.

## Environment Variables

The Framework reads these env vars by default (you can override with the `Client` class):

| Variable | Default | Purpose |
| --- | --- | --- |
| `NOVU_SECRET_KEY` | — | HMAC signing key; verifies request authenticity |
| `NOVU_API_URL` | `https://api.novu.co` | Cloud API URL — set to `https://eu.api.novu.co` for EU |
| `NODE_ENV` | — | If `development`, HMAC is disabled |

### EU Region Setup

```typescript
import { Client as NovuFrameworkClient } from "@novu/framework";
import { serve } from "@novu/framework/next";

export const { GET, POST, OPTIONS } = serve({
  client: new NovuFrameworkClient({
    secretKey: process.env.NOVU_SECRET_KEY,
  }),
  workflows: [/* … */],
});
```

```bash
NOVU_API_URL=https://eu.api.novu.co
NOVU_SECRET_KEY=<eu_secret_key>
```

## Best Practices

1. **Keep `NOVU_SECRET_KEY` server-only** — never commit it, never expose to the client. Use your platform's secrets manager (Vercel Env Vars, AWS Secrets Manager, GitHub Encrypted Secrets).
2. **Rotate the secret key periodically** — go to `dashboard.novu.co/api-keys`, create a new key, deploy it, then revoke the old one.
3. **Use separate keys per environment** — Dev and Prod must have different `NOVU_SECRET_KEY` values.
4. **Audit logs** — log every Bridge request server-side with subscriber id and workflow id so you can trace any anomaly.
5. **Set request timeout** — keep your `step.custom` operations under 30s. Longer operations should be enqueued (BullMQ, SQS) and resolved in a separate workflow.
6. **Don't return secrets in step output** — anything in `subject`/`body`/`data` is delivered to the user.
7. **Use HMAC for the Inbox too** — see [`inbox-integration` HMAC section](../../inbox-integration/SKILL.md#hmac-authentication).

## HMAC for the Inbox vs HMAC for the Bridge

These are separate but related:

| | Bridge HMAC | Inbox HMAC |
| --- | --- | --- |
| Direction | Cloud → Bridge | Inbox SDK → Cloud |
| Purpose | Authenticate Novu's call to your server | Authenticate the subscriber's session |
| Header / Param | `Novu-Signature` (auto by `serve`) | `subscriberHash` prop on `<Inbox>` |
| Computed how | Cloud signs with `NOVU_SECRET_KEY` | You compute `HMAC-SHA256(secretKey, subscriberId)` server-side |

Both use the same `NOVU_SECRET_KEY`. See [`inbox-integration` references](../../inbox-integration/references/security.md) for the Inbox HMAC details.

## Vercel Preview URLs

Vercel free-tier preview deployments are protected by default. Two ways to make the bridge reachable:

### 1. Bypass token (for sync only)

Enable [Protection Bypass for Automation](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation):

```bash
npx novu@latest sync \
  --bridge-url "https://my-app-preview.vercel.app/api/novu?x-vercel-protection-bypass=$BYPASS" \
  --secret-key $NOVU_SECRET_KEY
```

### 2. Disable protection on the preview branch (for runtime triggers)

Vercel Pro/Enterprise lets you disable Deployment Protection on a per-branch basis. Useful if you trigger workflows during preview integration tests.
