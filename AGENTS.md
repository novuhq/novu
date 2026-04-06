# AGENTS.md

## Cursor Cloud specific instructions

`pnpm setup:agent` has already been run. Do not run it again. The environment is fully configured: dependencies installed, enterprise packages linked, project built, `.env` files in place, Docker services running, and a default user/org seeded.

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
- Inactive apps — do not touch: `apps/inbound-mail`, `apps/webhook`
- Auto-generated — never edit: `libs/internal-sdk`
- Read-only dirs: `.idea/`, `playground/`, `.github/`, `scripts/`, `docker/`
- UI: reuse existing Radix/shadcn components only; do not copy patterns from `playground/` into production

<!-- Infrastructure & services: see .cursor/rules/infrastructure.mdc -->
<!-- Dependency graph: see .cursor/rules/dependency-graph.mdc -->
<!-- Testing: see .cursor/rules/testing.mdc -->
<!-- PR format: see .cursor/rules/pullrequest.mdc -->
<!-- Enterprise submodule: see .cursor/skills/enterprise-submodule/SKILL.md -->
