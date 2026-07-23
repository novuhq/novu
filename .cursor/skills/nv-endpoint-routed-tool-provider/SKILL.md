---
name: nv-endpoint-routed-tool-provider
description: >-
  Build or refactor a Tool-channel provider (PagerDuty, Opsgenie, future
  incident/alerting tools) to be endpoint-routed: per-subscriber secrets stored
  encrypted on ChannelEndpoint.endpoint behind a typed channel endpoint, a
  stateless provider that resolves routing from channelData at send time,
  SKIPPED steps when no endpoint exists, and the full
  API/worker/dashboard/docs/playground surface. Starts with a mandatory
  provider-docs discovery gate. Use when refactoring Opsgenie to the PagerDuty
  model, adding a new tool provider, or touching pagerduty_service channel
  endpoints.
---

# Endpoint-Routed Tool Provider (the PagerDuty model)

PagerDuty is the reference implementation. "Endpoint-routed" means the provider
has **no environment-level credentials**: every subscriber registers their own
secret (e.g. a PagerDuty Events API v2 routing key) as a channel endpoint, and
one trigger fans out to a different external service per subscriber. Grep for
`pagerduty_service` / `ENDPOINT_ROUTED_TOOL_PROVIDERS` to find every touch
point of the reference implementation.

## Step 0: Provider discovery gate (mandatory, before any code)

Every invariant and checklist item below encodes a fact from PagerDuty's
Events API v2 docs (32-char key regex, us/eu endpoints, `dedup_key`, 1024-char
summary limit). Do not transplant those facts onto another provider. First,
read the target provider's official API docs and pin down, with citations:

- **Per-recipient secret**: name, format (drives the validator regex and DTO
  `@Matches`), and scope. It must be issuable per recipient/service.
- **Regional endpoints**: the `region` equivalent, or none.
- **Idempotency**: the `dedup_key` equivalent and its retry semantics.
- **Payload contract**: required fields, size limits, allowed actions and
  severities (drives defaults, `RESERVED_OVERRIDE_KEYS`, and truncation).
- **Auth transport**: secret in body vs header.

Then apply the gate:

- **Open question that changes the design** (secret scope, missing
  idempotency, OAuth-only auth, ...): ask the user with concrete options. Do
  not assume.
- **An architecture invariant cannot be satisfied** (e.g. no per-recipient
  secret exists): halt. Explain which invariant fails and name the
  alternatives (credential-routed tool provider, OAuth connection model)
  instead of forcing this pattern.
- **All questions answered**: record the findings (they become the validator,
  provider defaults, and docs content) and proceed to the checklist.

## Architecture invariants (do not renegotiate these)

1. **Endpoint data lives encrypted on `ChannelEndpoint.endpoint`; connections
   are OAuth-only.** The wire shape (e.g. `{ routingKey, region }`) is accepted
   and returned by the API. Sensitive fields (routing key, API key, webhook URL
   and header values) are persisted encrypted on the endpoint document via
   `encryptChannelEndpoint`. Non-sensitive companions (`region`, `method`) stay
   plaintext. No synthetic `ChannelConnection` is created for these types.
2. **Exactly one endpoint per (environment, subscriber, integration)**,
   enforced by a Mongo partial unique index on the endpoint `type`. Duplicate
   `POST` → `409 Conflict`; rotation is a `PATCH` on the existing endpoint.
   (`tool_webhook` is the exception: many endpoints per subscriber are allowed.)
3. **The provider is stateless.** Constructor takes no credentials. Routing is
   resolved inside `sendMessage` from `options.channelData.endpoint`, guarded
   by `isChannelDataOfType(channelData, ENDPOINT_TYPES.X)`. Missing/wrong
   channelData throws.
4. **No endpoint → step is SKIPPED**, never errored. The worker send loop
   checks `ENDPOINT_ROUTED_TOOL_PROVIDERS` (a `Set` in
   `send-message-tool.usecase.ts`); credential-routed tool providers still fall
   back to `integration.credentials` when that pattern applies.
5. **Deterministic `dedup_key`** from `transactionId + subscriberId + stepId`
   so worker retries update the same incident instead of duplicating it. An
   explicit override wins.
6. **Secrets never leak**: not in logs, execution details, or message
   documents. Sensitive endpoint fields are encrypted at rest by
   `encryptChannelEndpoint`.
7. **`createSubscriberIfMissing`** (optional boolean on the create-endpoint
   body) JIT-creates the subscriber via `CreateOrUpdateSubscriberUseCase` with
   `allowUpdate: false` (create-only, never mutates). Without it, unknown
   subscriberId → 404 whose message names the flag. Connect surfaces are often
   the user's first Novu touchpoint, so client guides should pass `true`.

## Implementation checklist (slice order matters)

Only start after the discovery gate has passed. Work bottom-up; each slice
must build before the next (see Build order below).

**A. Foundations (`packages/shared`, `packages/stateless`, `libs/dal`, `libs/application-generic`)**
- [ ] Add `X_TYPE` to `ENDPOINT_TYPES` + wire shape in `ChannelEndpointByType` — `packages/shared/src/types/channel-endpoint.ts`
- [ ] Mirror both in `packages/stateless/src/lib/provider/channel-data.type.ts`; add the `XData` type to `ChannelData` and to `ENDPOINT_TYPES_REQUIRING_TOKEN`
- [ ] Partial unique index in `libs/dal/src/repositories/channel-endpoint/channel-endpoint.schema.ts` (`{ _environmentId, subscriberId, integrationIdentifier, type }`, `partialFilterExpression: { type }`) when cardinality is 1:1
- [ ] Extend `encryptChannelEndpoint` / decrypt helpers in `libs/application-generic/src/encryption/` so sensitive endpoint fields encrypt at rest (+ spec)
- [ ] Validator entry in `libs/application-generic/src/schemas/channel-endpoint/channel-endpoint.schema.ts` (format-validate the secret, e.g. `/^[a-zA-Z0-9]{32}$/`, and reject extra keys)

**B. Provider (`packages/providers`, `libs/application-generic`)**
- [ ] Stateless provider in `packages/providers/src/lib/tool/<provider>/` — resolve routing from `channelData`, deterministic dedup, reserved-override handling (+ spec)
- [ ] Handler in `libs/application-generic/src/factories/tool/handlers/` — `buildProvider` ignores `ICredentials`
- [ ] Empty credentials config in `packages/shared/src/consts/providers/credentials/provider-credentials.ts` (`export const xConfig: IConfigCredential[] = []`) with a comment pointing at the channel-endpoints API

**C. API (`apps/api/src/app/channel-endpoints`)**
- [ ] Endpoint DTO in `dtos/endpoint-types.dto.ts` (regex-validate the secret) + `Create<X>EndpointDto` in `dtos/create-channel-endpoint-variants.dto.ts`
- [ ] Controller: `@ApiExtraModels` + `oneOf` + discriminator mapping for the new DTO
- [ ] Create usecase: persist the endpoint directly with `encryptChannelEndpoint` (no connection create); duplicate-key → 409; update usecase re-encrypts rotated secrets on the endpoint; delete removes the endpoint document; get/list decrypt sensitive fields for the wire response
- [ ] e2e in `e2e/create-channel-endpoint.e2e.ts`: happy path, 409, rotation, `createSubscriberIfMissing` (404 hint / JIT create / no-mutation)

**D. Worker (`apps/worker/src/app/workflow/usecases/send-message`)**
- [ ] `resolve-channel-endpoints.usecase.ts`: decrypt the endpoint document into `channelData.endpoint`
- [ ] `send-message-tool.usecase.ts`: add the provider id to `ENDPOINT_ROUTED_TOOL_PROVIDERS`; verify SKIPPED + execution detail on missing endpoint (+ spec for the predicate)

**E. Surface (dashboard, docs, playground)**
- [ ] Provider const in `packages/shared/src/consts/providers/channels/tool.ts` with `docReference` → `https://docs.novu.co/platform/integrations/tool/<provider>` (rebuild `@novu/shared` after)
- [ ] Docs guide `docs/platform/integrations/tool/<provider>.mdx` + register in the `Tool` group of `docs/docs.json` — see [reference.md](reference.md) for the required page structure
- [ ] Playground demo under `playground/nextjs` mirroring the PagerDuty trio: `src/lib/<provider>-endpoint-connect.ts`, `src/pages/api/<provider>-endpoint.ts`, `src/components/<provider>-end-user-connect.tsx` + Clerk-gated page + SideNav entry

For per-file code patterns (index definition, provider skeleton, usecase
transaction shape, DTO union, worker extraction, playground helper contract),
see [reference.md](reference.md).

## Opsgenie refactor note

Opsgenie is credential-routed today (env-level `apiKey`). Refactoring it to
this model = running the checklist with `opsgenie_*` as the endpoint type and
**removing** it from the credential-routed fallback: empty `opsgenieConfig`,
drop the API-key read in `opsgenie.handler.ts`, add it to
`ENDPOINT_ROUTED_TOOL_PROVIDERS`. PagerDuty was never released so it had no
migration; Opsgenie may need one — check for existing integrations with
credentials before deleting the old path. The discovery gate still applies:
confirm Opsgenie's Alert API supports per-recipient API keys and idempotent
alert deduplication before assuming parity with PagerDuty.

## Build order & verification

```bash
# types flow stateless → providers → application-generic; skipping a step
# yields phantom TS errors (missing channelData on IToolOptions, etc.)
pnpm --filter @novu/shared build
pnpm --filter @novu/stateless build
pnpm --filter @novu/providers build
pnpm --filter @novu/application-generic build

# provider unit tests
CI=true pnpm --filter @novu/providers exec vitest run src/lib/tool/<provider>

# channel-endpoints e2e (from apps/api)
pnpm exec cross-env NODE_ENV=test CI_EE_TEST=true CLERK_ENABLED=true \
  NODE_OPTIONS=--max_old_space_size=8192 mocha --timeout 30000 --retries 3 \
  --grep '#novu-v2' --require ./swc-register.js --exit --file e2e/setup.ts \
  'src/**/create-channel-endpoint.e2e{,-ee}.ts'
```

## Gotchas learned the hard way

- **Module DI**: JIT subscriber creation needs `SharedModule` +
  `CreateOrUpdateSubscriberUseCase` + `UpdateSubscriber` +
  `UpdateSubscriberChannel` as providers in `channel-endpoints.module.ts`
  (mirror `channel-connections.module.ts` for the DI pattern only; these tool
  endpoints do not create connections).
- **Worker/app-generic specs need `STORE_ENCRYPTION_KEY`** (32 chars) in the
  env or `encryptChannelEndpoint` throws a Buffer TypeError.
- **`@novu/api` SDK lags**: until the OpenAPI regen runs, the internal SDK's
  create-endpoint union won't include the new DTO — playground/demo code calls
  the raw REST endpoint (`novuFetch` pattern) and swaps to the SDK later.
  Never edit `libs/internal-sdk` by hand.
- **Dashboard View Guide CTA**: zero-credential providers skip the credentials
  accordion; the docs CTA in `integration-settings.tsx` must live outside the
  `providerCredentials.length > 0` block or it never renders.
- **Dashboard gating**: the Tool channel is behind the
  `IS_TOOL_CHANNEL_ENABLED` LaunchDarkly flag — check it before debugging a
  "missing provider" in the integration store.
- **Secrets in reads**: Novu returns secrets on read and masks client-side
  (last 4 chars, `••••XXXX`) — follow that convention, don't invent
  server-side masking.
- **Writing style**: no em dashes (`—`) in this feature's docs/UI copy; use
  periods, colons, or parentheses.
