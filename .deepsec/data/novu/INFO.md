# novu

## What this codebase does

Novu is open-source notification / communication infrastructure (Inbox,
Email, SMS, Push, Chat, plus agent channels). Nx monorepo: NestJS API
(`apps/api`), React dashboard (`apps/dashboard`), `apps/worker`,
`apps/ws`; shared code in `packages/*` and `libs/*` (data access in
`libs/dal`, business logic in `libs/application-generic`). Storage:
MongoDB, Redis + Bull, ClickHouse. Strictly multi-tenant:
organization → environment → subscriber. Open-core — `enterprise/`,
`.source/` (EE submodule), and `*/ee/` dirs are commercially licensed.

## Auth shape

- `@RequireAuthentication()` — MUST wrap every protected controller/route.
  Swaps between community `CommunityUserAuthGuard` (JWT **or** API key) and
  `@novu/ee-auth` via `isEEAuthEnabled()`.
- `@ExternalApiAccessible()` — gates whether a route accepts API-key auth
  (public SDK/API). Without it, API-key requests are rejected even if the key
  is valid. Absence ≠ safe; presence widens the attack surface.
- `@RequirePermissions(PermissionsEnum.X)` + `@UserSession() user: UserSessionData`
  — RBAC and the tenant-scoped session. All DAL queries must be scoped by
  `user.environmentId` / `user.organizationId`.
- Secrets: API keys sha256-hashed (`ApiKeyStrategy`) and stored encrypted
  (`encryptApiKey` / `decryptApiKey`); subscriber HMAC via `isHmacValid`
  compared with timing-safe `areHexDigestsEqual`. `RootEnvironmentGuard`
  limits some actions to the Development environment.

## Threat model

Tenant isolation is the crown jewel: cross-environment or cross-org data
leakage from a repository query that forgets `_environmentId` /
`_organizationId` scoping. Next: leakage of API keys, subscriber HMAC, or
provider/integration credentials (`packages/providers`), which enable
spoofed notifications and access to subscriber PII (emails, phones, push
tokens). Privilege escalation via missing `@RequirePermissions`.

## Project-specific patterns to flag

- A `@Controller` route with no `@RequireAuthentication()`, or an
  `@ExternalApiAccessible()` route with no `@RequirePermissions`.
- A `libs/dal` repository query not filtered by `_environmentId` /
  `_organizationId` (tenant-scoping bypass) — the highest-signal bug here.
- DB queries / business logic in controllers instead of a CQRS use-case
  (`execute(command)`); usually means scoping was skipped.
- Comparing tokens / API keys / HMAC with `===` instead of
  `areHexDigestsEqual` (timing-safe).
- New EE code not gated behind `isEEAuthEnabled()` or Novu enterprise env
  flags, leaking enterprise behavior into the Community edition.

## Known false-positives

- `apps/api/src/app/testing/*` and `TestApiRateLimitController` — test-only,
  guarded by `NODE_ENV === 'test'` or `@ApiExcludeController`.
- `*-public.controller.ts` (e.g. agents-public, agents-mcp-oauth), plus
  inbox / connect / widgets session endpoints — intentionally use
  subscriber-JWT, HMAC, or OAuth-state auth, not user `@RequireAuthentication`.
- `bridge.controller.ts` — authenticated by HMAC request signature, not the
  standard user guard.
- `.source/` and `enterprise/` — EE submodule
- `playground/` — demos and fixtures, not production code.
