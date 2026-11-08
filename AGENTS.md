# AGENTS.md

## Cursor Cloud specific instructions

`pnpm setup:agent` has already been run. Do not run it again. The environment is fully configured: dependencies installed, enterprise packages linked, project built, `.env` files in place, Docker services running, and a default user/org seeded. The dashboard auto signs in the pre-seeded agent user when opened in the browser (no manual login unless auto sign-in fails).

## Build

Run `pnpm build` after changes to `packages/` or `enterprise/`, and in `apps/mcp-server` after changing `src/tools` or `src/utils` (the enterprise Copilot imports its `dist`). Other direct changes to `apps/` do not require a rebuild.

## Hot path

The trigger → worker → provider path runs once per subscriber per step. Don't add database or cache reads/writes there without a reason; if you do, say so in the PR description with the expected volume.

## Sensitive spots

When writing or reviewing a change, check these and call them out in the PR description if touched:
- Tenant isolation: every MongoDB query filters by `_environmentId` or `_organizationId`; every ClickHouse query filters by `environment_id` or `organization_id` (`LogRepository` adds `environment_id` from `enforced.environmentId`).
- Secrets: API keys, integration credentials and connection auth stay encrypted at rest (`libs/application-generic/src/encryption/`) and never reach logs, API responses or the client.
- Endpoints: new or changed routes that need a user session use `@RequireAuthentication()` and the right `@RequirePermissions(...)`; intentionally public routes stay public and subscriber routes keep their subscriber guard (`AuthGuard('subscriberJwt')`).
- Hot path: see above.
- Edition gating: see Novu Distribution below.

## AI Boundaries

### Always
- Work within: `apps/api`, `apps/dashboard`, `apps/worker`, `apps/ws`, `apps/mcp-server` (read `apps/mcp-server/AGENTS.md` first)
- Use shared packages: `packages/shared`, `packages/framework`, `packages/js`, `packages/react`
- Follow `libs/dal` for data access, `libs/application-generic` for business logic

### Ask First
- Before creating new UI components not in `apps/dashboard/src/components/`
- Before adding npm dependencies
- Before modifying MongoDB models, ClickHouse table definitions, or anything in `enterprise/` or `packages/providers/`

### Never
- Inactive apps — do not touch, unless monorepo wide refactor: `apps/webhook`
- Auto-generated — never edit: `libs/internal-sdk`
- UI: reuse existing Radix/shadcn components only; do not copy patterns from `playground/` into production code
- If doing a monorepo wide refactor, you can touch the read only, but only when necessary.


## Developer-local agent config

If a **`.agents-local/`** directory exists in your working copy, read **`.agents-local/README.md`** first for personal, git-ignored agent configuration, skills and rules. Absence of the directory is normal.

## Novu Distribution
Novu is distributed in 3 modes, Community Edition, Enterprise Cloud Edition, and On-Prem Enterprise Edition.

When making changes targeted to the Enterprise distribution, we need to make sure that the changes are not breaking the Community edition, and are properly gated behind a flag, or the novu enterpise env variables. Similarly when some changes are only targeting the Cloud, self-hosted on prem should not be affected.

## Where to look

Read these when the task touches the area:
- Infrastructure and services: `.cursor/rules/infrastructure.mdc`
- Dependency graph: `.cursor/rules/dependency-graph.mdc`
- Testing: `.cursor/rules/testing.mdc`
- PR format: `.cursor/rules/pullrequest.mdc`
- Per-app conventions: `.cursor/rules/<api|worker|ws|dashboard|dal-repository|clickhouse>.mdc`
- `enterprise/` is the `novuhq/packages-enterprise` repo, mounted as the `.source` submodule; changes need a paired PR there (see `.agents/skills/enterprise-submodule/SKILL.md`)
- MCP server tools and schemas (`apps/mcp-server`): `apps/mcp-server/AGENTS.md` and `.agents/skills/nv-mcp-server-tools/SKILL.md`
- `@novu/thalamus` comes from the separate `novuhq/thalamus` repo; its source isn't in this monorepo
