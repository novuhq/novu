---
name: onboard-dcr-mcp
description: Onboard a new DCR OAuth MCP catalog entry with provider-doc vetting, curl probes, optional recorded fixtures, and per-provider strategy guidance. Use when adding or changing `mode: dcr` entries in MCP_SERVERS or wiring a quirky DCR provider. Abort if the provider requires whitelist or manual approval.
---

# Onboard DCR MCP

Use this checklist when adding a new `mode: dcr` entry to [`packages/shared/src/consts/providers/mcp-servers.ts`](packages/shared/src/consts/providers/mcp-servers.ts).

## Provider docs gate (run first)

Before curl probes, catalog edits, or strategy work:

1. Read the provider's official OAuth / MCP / DCR documentation.
2. Confirm Novu can register clients dynamically without manual intervention.

**Abort onboarding** and report back to the user if the provider requires any of:

- Redirect URI or OAuth app **whitelist** pre-approval
- Manual review / approval of DCR registrations before the client becomes active
- A fixed pre-registered app (`client_id` supplied by the provider) instead of RFC 7591 DCR
- Partner or onboarding approval before OAuth apps are allowed

Include the doc link and the specific requirement that blocked onboarding. Do not add a catalog entry or run live probes for providers that fail this gate. **Append the provider to [`blocked-mcp-servers.md`](./blocked-mcp-servers.md)** (Open blockers table).

## When you need more than a catalog entry

| Situation | Action |
|-----------|--------|
| PRM + AS metadata + DCR + token exchange all follow RFC behavior | Catalog entry only |
| AS downgrades auth method at DCR (e.g. returns `none`) | Generic flow already handles RFC 7591 §3.2.1 — no strategy file |
| Token endpoint returns non-standard JSON (200 + inline error, custom fields) | Add `apps/api/src/app/agents/mcp/oauth/dcr-provider-strategies/<mcp-id>.strategy.ts` and register it in `dcr-provider-strategy-registry.ts` |
| Discovery needs provider-specific behavior | Stop — discuss a new hook in `dcr-provider-strategy.ts` first (review-gated) |

Default rule: **do not touch** `generate-mcp-oauth-url.usecase.ts` or `mcp-oauth-callback.usecase.ts` for a new provider.

## Curl probe checklist

Replace placeholders before running. Paste command output into the PR body.

### 1. Protected Resource Metadata (RFC 9728)

```bash
MCP_URL="https://mcp.example.com/mcp"
curl -sS "$MCP_URL/.well-known/oauth-protected-resource" | jq .
# Also try path-suffixed well-known if the MCP URL has a path:
curl -sS "$(python3 - <<'PY'
from urllib.parse import urlparse
u = urlparse("https://mcp.example.com/mcp")
print(f"{u.scheme}://{u.netloc}/.well-known/oauth-protected-resource{u.path.rstrip('/')}")
PY
)" | jq .
```

Confirm: `authorization_servers` is non-empty, `scopes_supported` or challenge scope is documented.

### 2. Authorization Server metadata (RFC 8414)

```bash
ISSUER="https://auth.example.com"
curl -sS "$ISSUER/.well-known/oauth-authorization-server" | jq .
```

Confirm:

- `authorization_endpoint`, `token_endpoint`, `registration_endpoint` present
- `code_challenge_methods_supported` includes `S256`
- `token_endpoint_auth_methods_supported` documented

### 3. Dynamic Client Registration (RFC 7591)

```bash
REGISTER_URL="https://auth.example.com/register"
REDIRECT_URI="https://api.novu.co/v1/agents/mcp/oauth/callback"
curl -sS -X POST "$REGISTER_URL" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "{
    \"redirect_uris\": [\"$REDIRECT_URI\"],
    \"client_name\": \"Novu probe\",
    \"application_type\": \"web\",
    \"grant_types\": [\"authorization_code\", \"refresh_token\"],
    \"response_types\": [\"code\"],
    \"token_endpoint_auth_method\": \"client_secret_post\"
  }" | jq .
```

Confirm:

- Response includes `client_id`
- Note effective `token_endpoint_auth_method` if it differs from the request
- Delete or revoke the probe client if the AS supports it

### 4. Scope sanity

Record which scopes the PRM advertises and which scope string Novu should request on authorize. If PRM omits scopes, note that in the PR.

## Optional recorded fixture (quirky providers)

For providers that need regression coverage without live network tests:

1. Capture JSON from the probes above.
2. Create `apps/api/src/app/agents/mcp/oauth/dcr-provider-strategies/__fixtures__/<mcp-id>/` with:
   - `manifest.json`
   - `prm.json`
   - `as-metadata.json`
   - `dcr-register-response.json` (optional)
   - `token-exchange-response.json` (optional)
3. Add a Vitest/Mocha spec that calls `loadDcrFixtureDirectory()` and `createDcrFixtureOutboundHandlers()` from [`__fixtures__/_shared/replay.ts`](apps/api/src/app/agents/mcp/oauth/dcr-provider-strategies/__fixtures__/_shared/replay.ts).

See the `example/` fixture directory for layout.

## PR body template

```markdown
## DCR onboarding evidence

- MCP id:
- MCP URL:
- Issuer:

### PRM
(paste curl output)

### AS metadata
(paste curl output)

### DCR register probe
(paste curl output; redact client_secret if returned)

### Scope notes
(which scopes PRM advertises / which Novu will request)

### Strategy needed?
- [ ] No — catalog entry only
- [ ] Yes — `<mcp-id>.strategy.ts` because ...
```

## Code touch list

1. Add catalog entry in `packages/shared/src/consts/providers/mcp-servers.ts`
2. Run `pnpm build --filter @novu/shared` if shared types changed
3. Only if needed: add strategy file + register in `dcr-provider-strategy-registry.ts`
4. Only if needed: add fixture replay spec under `dcr-provider-strategies/__fixtures__/`
5. Confirm `packages/shared/src/consts/providers/mcp-servers.spec.ts` DCR schema test passes
6. If blocked: append a row to [`blocked-mcp-servers.md`](./blocked-mcp-servers.md); if unblocked later, move the row to Resolved
