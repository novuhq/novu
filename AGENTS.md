# AGENTS.md

## Cursor Cloud specific instructions

`pnpm setup:agent` has already been run. Do not run it again. The environment is fully configured: dependencies installed, enterprise packages linked, project built, `.env` files in place, Docker services running, and a default user/org seeded. The dashboard auto signs in the pre-seeded agent user when opened in the browser (no manual login unless auto sign-in fails).

## Build

Run `pnpm build` after changes to `packages/` or `enterprise/`. Direct changes to `apps/` do not require a rebuild.

## AI Boundaries

### Always
- Work within: `apps/api`, `apps/dashboard`, `apps/worker`, `apps/ws`
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


## Novu Distribution
Novu is distributed in 3 modes, Community Edition, Enterprise Cloud Edition, and On-Prem Enterprise Edition.

When making changes targeted to the Enterprise distribution, we need to make sure that the changes are not breaking the Community edition, and are properly gated behind a flag, or the novu enterpise env variables. Similarly when some changes are only targeting the Cloud, self-hosted on prem should not be affected.


<!-- Infrastructure & services: see .cursor/rules/infrastructure.mdc -->
<!-- Dependency graph: see .cursor/rules/dependency-graph.mdc -->
<!-- Testing: see .cursor/rules/testing.mdc -->
<!-- PR format: see .cursor/rules/pullrequest.mdc -->
<!-- Enterprise submodule: see .cursor/skills/enterprise-submodule/SKILL.md -->
