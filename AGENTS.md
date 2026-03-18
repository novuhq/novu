# AGENTS.md

## Cursor Cloud specific instructions

When running in the cloud environment `pnpm setup:agent` was already run — env files, build, and enterprise packages are already set up.

## Build

Run `pnpm build:with-ee` after changes to `packages/` or `enterprise/`. Direct changes to `apps/` do not require a rebuild.

`pnpm check` runs Biome across the monorepo. Pre-existing warnings are expected.

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

<!-- Dependency graph: see .cursor/rules/dependency-graph.mdc -->
<!-- Infrastructure setup: see .cursor/rules/infrastructure.mdc -->
<!-- PR format: see .cursor/rules/pullrequest.mdc -->
