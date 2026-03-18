# API Service

NestJS REST API service — the core backend for the Novu platform.

## Stack

- **Framework**: NestJS + Express
- **Database**: MongoDB (via `libs/dal` repositories), ClickHouse (analytics, traces, activity feed)
- **Cache / Queues**: Redis + Bull
- **Auth**: Clerk or Better Auth (env-driven), JWT, Passport
- **OpenAPI**: `@nestjs/swagger` + Spectral lint

## Running

```bash
pnpm start:api:dev   # hot reload via nest start --watch
```

The API runs on **port 3000**. OpenAPI UI is available at `http://localhost:3000/openapi` during local development.

## Testing

```bash
# Unit tests
cd apps/api && pnpm test

# E2E tests
# See .cursor/skills/run-api-e2e-tests/SKILL.md for full instructions
```

## Code Quality

```bash
cd apps/api && pnpm check   # Biome lint + format
npm run lint:openapi        # Validate OpenAPI spec (requires API running)
```

## Key Directories

```
apps/api/src/app/                          # Route controllers and modules
apps/api/src/ee/                           # Enterprise-only features
apps/api/migrations/                       # MongoDB migrations
apps/api/migrations/clickhouse-migrations/ # ClickHouse schema migrations
```

<!-- Coding conventions: see .cursor/rules/api.mdc -->
<!-- Monorepo-wide boundaries: see root AGENTS.md -->
