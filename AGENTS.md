# AGENTS.md

## Cursor Cloud specific instructions

When running in the cloud environment the pnpm setup:agent was already run, so you don't need to run it again and everything should be already setup (including .env files copied from .env.agent, and pnpm build and install with enterprise packages).

## Infrastructure Services

Start with: `docker compose -f docker/local/docker-compose.yml up -d`

| Service | Port | Purpose |
|---------|------|---------|
| MongoDB | 27017 | Primary database |
| Redis | 6379 | Caching + Bull queues |
| ClickHouse | 8123 (HTTP) / 9000 (native) | Analytics, activity feed, traces |
| LocalStack | 4566 | S3 emulation (optional) |

## Global Build Rules

Before running services, run `pnpm build:with-ee` to ensure all code changes are built. Only required when you made changes to the `packages/` or `enterprise/` folders. Direct changes to the `apps/` folder do not require a rebuild.

## Linting

`pnpm check` runs Biome across the entire monorepo. Pre-existing warnings/errors are expected in this large codebase.

## App-Specific Instructions

Each application has its own `AGENTS.md` with stack details, run commands, testing, and conventions:

- **API**: [`apps/api/AGENTS.md`](apps/api/AGENTS.md)
- **Dashboard**: [`apps/dashboard/AGENTS.md`](apps/dashboard/AGENTS.md)
- **Worker**: [`apps/worker/AGENTS.md`](apps/worker/AGENTS.md)
- **WebSocket**: [`apps/ws/AGENTS.md`](apps/ws/AGENTS.md)

## Creating Pull Requests

Follow the Conventional Commits specification. As a team member, include the Linear ticket ID at the end.

Expected format: `feat(scope): Add fancy new feature fixes NOV-123`

Possible scopes: `dashboard`, `api-service`, `worker`, `shared`, `js`, `react`, `react-native`, `nextjs`, `providers`, `root`

PR title must end with `fixes TICKET-ID` (e.g., `fixes NOV-123`) when a linear ticket id is available in context.

### Enterprise Packages

When a change was made in the packages of enterprise, we need to also create a PR in the novuhq/packages-enterprise repository committing the linked changes (creating a similar branch from next there).
