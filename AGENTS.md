# AGENTS.md

## Cursor Cloud specific instructions

When running in the cloud environment the pnpm setup:agent was already run, so you don't need to run it again and everything should be already setup (including .env files copied from .env.agent, and pnpm build and install with enterprise packages).

### Prerequisites
- **Docker** required for MongoDB, Redis, ClickHouse, and LocalStack

### Infrastructure Services

Start with: `docker compose -f docker/local/docker-compose.yml up -d`

| Service | Port | Purpose |
|---------|------|---------|
| MongoDB | 27017 | Primary database |
| Redis | 6379 | Caching + Bull queues |
| ClickHouse | 8123/9000 | Analytics (optional) |
| LocalStack | 4566 | S3 emulation (optional) |


**🏃 Running Services:**
Before running the use computer resource to navigate to the dashboard, make sure to run pnpm build:with-ee script to ensure all your code changes are built and ready to be used. Only run those changes if you made changes to the "packages" folder or the "enterprise" folder. Direct changes to the "apps" folder should not require a build, as it will be done automatically when you run the start:dashboard script or worker, etc...

```bash
# Core development stack
pnpm start:api:dev    # API service with hot reload
pnpm start:dashboard  # New React dashboard  
```

Key gotchas:
- The Dashboard Vite dev server runs on **port 4201** (configured in `apps/dashboard/vite.config.ts`)
- The Worker service must be running when testing the triggering of a workflow notification in Novu, otherwise can be skipped.

```
pnpm start:worker    # Background worker
```

### Dashboard interaction
Immediatly after creating a new user in the dashboard, you will need to create a new organization. After the organization name is submitted, you can immediatly navigate to the localhost:4201 root url and you should see the dashboard directly on the workflows page (Avoid doing the full onboarding unless requested).

### Linting

`pnpm check` runs Biome across the entire monorepo. Pre-existing warnings/errors are expected in this large codebase. The linter itself functions correctly.

### Testing


- API E2E tests: see `.cursor/skills/run-api-e2e-tests/SKILL.md`
- Dashboard E2E: `cd apps/dashboard && pnpm test:e2e`
- API unit tests: `cd apps/api && pnpm test`

## Creating Pull Requests
Requirements:

Follow the Conventional Commits specification
As a team member, include Linear ticket ID at the end: fixes TICKET-ID or include it in your branch name
Expected format: feat(scope): Add fancy new feature fixes NOV-123

Possible scopes:
- dashboard
- api-service
- worker
- shared
- js
- react
- react-native
- nextjs
- providers
- root 

PR title must end with 'fixes TICKET-ID' (e.g., 'fixes NOV-123') when a linear ticket id is available in context.
