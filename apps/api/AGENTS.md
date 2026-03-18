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

## Adding Endpoints

### Choose or create a controller

- Add to an existing controller if the endpoint belongs to an existing entity.
- Create a new controller for new entities.

### Required decorators

- `@RequireAuthentication()` — guards the route and makes it accessible to the Novu web app.
- `@ExternalApiAccessible` — marks the endpoint as accessible via API key and the official Novu SDK.

### Naming conventions

| Operation | Method name pattern |
|-----------|-------------------|
| Get single | `getEntityName` |
| Get list | `listEntityName` (add pagination) |
| Create | `createEntityName` |
| Update | `updateEntityName` |
| Delete | `deleteEntityName` |

Use `@SdkUsePagination` for paginated list endpoints. Use `@SdkGroupName` with `.` separator to create SDK subresources (e.g., `Subscribers.Notifications`). Use `@SdkMethodName` for unique operations.

## Database Migrations

### MongoDB

Migrations live in `./migrations/<change-description>/<change-action>.ts`.

```bash
npm run migration -- ./migrations/<change-description>/<change-action>.ts
```

Keep migration script names stable — they appear in user-facing docs and release notes.

### ClickHouse

Numbered `.sql` migrations in `./migrations/clickhouse-migrations/`.

```bash
pnpm run clickhouse:migrate:local
```

Analytics service layer and repositories: `libs/application-generic/src/services/analytic-logs/`.

## Key Directories

```
apps/api/src/app/                          # Route controllers and modules
apps/api/src/ee/                           # Enterprise-only features
apps/api/migrations/                       # MongoDB migrations
apps/api/migrations/clickhouse-migrations/ # ClickHouse schema migrations
```

## Boundaries

### Never
- Query MongoDB models directly — always use `libs/dal` repositories
- Omit `_environmentId` or `_organizationId` from queries — tenant isolation is required
- Put business logic in controllers — use CQRS use-cases
- Reference `apps/web` or `libs/embed` — those projects have been removed from this repo

### Ask First
- Before adding a new endpoint that has no auth decorators (`@RequireAuthentication`, `@ExternalApiAccessible`)
- Before creating new MongoDB migrations or ClickHouse schema changes
- Before touching anything in `apps/api/src/ee/`

See [root AGENTS.md](../../AGENTS.md) for monorepo-wide boundaries.
