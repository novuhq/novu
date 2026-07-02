---
name: nv-onboard-dcr-mcp
description: Onboard a new DCR OAuth MCP catalog entry with provider-doc vetting and curl probes. Use when adding or changing `mode: dcr` entries in MCP_SERVERS. Abort if the provider requires whitelist or manual approval.
---

# Onboard DCR MCP

Use this checklist when adding a new `mode: dcr` entry to [`packages/shared/src/consts/providers/mcp-servers.ts`](../../../packages/shared/src/consts/providers/mcp-servers.ts).

## Candidate selection (run before probes)

**Default goal:** upgrade or add catalog entries — not re-audit providers already on `dcr`.

Read [`mcp-servers.ts`](../../../packages/shared/src/consts/providers/mcp-servers.ts) and [`blocked-mcp-servers.md`](./blocked-mcp-servers.md), then classify each target:

| Catalog `oauth.mode` | Blocked list | Action |
|----------------------|--------------|--------|
| `provider-managed` (or missing entry) | not listed | **Onboard** — docs gate + probes + catalog/blocker edits |
| `provider-managed` | open blocker | **Skip** — already triaged; only re-probe if user says unblocked |
| `dcr` | — | **Skip** — do **not** run full onboarding or assign batch agents |
| `novu-app` / `user-app` | — | **Skip** — out of scope for this skill unless user asks |

**Do not** label work as `VERIFY_ONLY` in a batch onboarding run. That outcome is for explicit single-provider regression requests only (e.g. “re-probe Sentry after an outage”).

### Picking providers (including parallel / N-agent runs)

1. Build the eligible pool: `provider-managed` (or net-new) + user’s category filter (e.g. `category: 'code'`) − open blockers − already `dcr`.
2. Assign **one unique id per agent** from that pool only.
3. If the pool has fewer than N candidates, onboard fewer — do **not** pad with existing `dcr` entries.
4. Prefer catalog entries whose description still says “managed runtime provider” — strong signal they were never probed.

```bash
# Example: list provider-managed code MCPs not on the blocked list (adjust paths)
rg "id: '" packages/shared/src/consts/providers/mcp-servers.ts -A6 | rg -B5 "ProviderManaged" | rg "category: 'code'"
rg "^\| \`" .cursor/skills/nv-onboard-dcr-mcp/blocked-mcp-servers.md
```

### When re-probing an existing `dcr` entry is allowed

Only if the user **explicitly** requests verification or there is a production incident for that id. Then: probes + short report; **no** catalog mode change unless probes fail (downgrade to `provider-managed` + blocker row).

## Provider docs gate (run first)

Before curl probes or catalog edits:

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
| AS downgrades auth method at DCR (e.g. returns `none`) | Generic flow already handles RFC 7591 §3.2.1 |
| Issuer / PRM / gateway mismatch (Clerk, Vercel, PlanetScale-style) | Extend `mcp-oauth-issuer-match.ts` (review-gated) |
| Token endpoint returns non-standard JSON | Extend `mcp-oauth-callback/token-exchange-outcome.ts` (review-gated) |
| PRM advertises oversized `scopes_supported` (Slack URL limits) | Pin `oauth.scopes` on the catalog `dcr` entry |

Default rule: **do not touch** `generate-mcp-oauth-url.usecase.ts` or `mcp-oauth-callback.usecase.ts` for a new provider unless discovery or token parsing truly cannot express the quirk generically.

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

Record which scopes the PRM advertises and which scope string Novu should request on authorize. If PRM omits scopes, note that in the PR. If the list is huge, pin a curated subset on `oauth.scopes` in the catalog entry.

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

### Code changes beyond catalog?
- [ ] No — catalog entry only
- [ ] Yes — discovery issuer matching because ...
- [ ] Yes — token-exchange-outcome because ...
```

## Code touch list

0. Confirm candidate was **not** already `oauth.mode: dcr` (see Candidate selection)
1. Add catalog entry in `packages/shared/src/consts/providers/mcp-servers.ts`
2. Run `pnpm build --filter @novu/shared` if shared types changed
3. Only if needed: discovery or `token-exchange-outcome.ts` changes (review-gated)
4. Confirm `packages/shared/src/consts/providers/mcp-servers.spec.ts` DCR schema test passes
5. If blocked: append a row to [`blocked-mcp-servers.md`](./blocked-mcp-servers.md); if unblocked later, move the row to Resolved
