# AGENTS.md

## Cursor Cloud specific instructions

### Prerequisites

- **Node.js 20.19.0** (via nvm, see `.nvmrc`)
- **pnpm 10.16.1** (see `package.json` `packageManager` field)
- **Docker** required for MongoDB, Redis, ClickHouse, and LocalStack

### Infrastructure Services

Start with: `docker compose -f docker/local/docker-compose.yml up -d`

| Service | Port | Purpose |
|---------|------|---------|
| MongoDB | 27017 | Primary database |
| Redis | 6379 | Caching + Bull queues |
| ClickHouse | 8123/9000 | Analytics (optional) |
| LocalStack | 4566 | S3 emulation (optional) |

### Running Services

See `CLAUDE.md` for standard commands (`pnpm start:api:dev`, `pnpm start:dashboard`, etc.).

Key gotchas:
- The Dashboard Vite dev server runs on **port 4201** (configured in `apps/dashboard/vite.config.ts`), not 4200.
- `FRONT_BASE_URL` in `apps/api/src/.env` must use `http://localhost:4201` (not `127.0.0.1`) to avoid CORS issues with the browser origin.
- `.env` changes require restarting the respective service (NestJS `--watch` mode does NOT auto-reload env vars).
- The Worker and WS services must also be running for full functionality.

### Enterprise / Submodule Setup

The enterprise submodule at `.source` requires SSH access to `github.com:novuhq/packages-enterprise.git`. In cloud environments where SSH is blocked, configure HTTPS:
```bash
git config --global url."https://github.com/".insteadOf "git@github.com:"
gh auth setup-git
git submodule update --init --recursive
```

After initializing the submodule: `pnpm install:with-ee && pnpm build:with-ee`

See `.cursor/skills/enterprise-submodule/SKILL.md` for full submodule workflow.

### Better Auth (Enterprise)

When using Better Auth (`EE_AUTH_PROVIDER=better-auth`):
- Add `BETTER_AUTH_SECRET`, `EE_AUTH_PROVIDER=better-auth`, `NOVU_ENTERPRISE=true`, and `IS_SELF_HOSTED=true` to `apps/api/src/.env`
- Add `VITE_EE_AUTH_PROVIDER=better-auth`, `VITE_NOVU_ENTERPRISE=true`, `VITE_SELF_HOSTED=true` to `apps/dashboard/.env`
- Better Auth stores users in `auth-system-users` and `auth-system-accounts` MongoDB collections (separate from the Novu `users` collection).
- To skip email verification locally, set `BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION=false` in the API env, or manually set `emailVerified: true` in the `auth-system-users` collection.

### Linting

`pnpm check` runs Biome across the entire monorepo. Pre-existing warnings/errors are expected in this large codebase. The linter itself functions correctly.

### Testing

- API E2E tests: see `.cursor/skills/run-api-e2e-tests/SKILL.md`
- Dashboard E2E: `cd apps/dashboard && pnpm test:e2e`
- API unit tests: `cd apps/api && pnpm test`
