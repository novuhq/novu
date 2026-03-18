# AGENTS.md

## Cursor Cloud specific instructions

`pnpm setup:agent` has already been run. Do not run it again. The environment is fully configured: dependencies installed, enterprise packages linked, project built, `.env` files in place, Docker services running, and a default user/org seeded.

### Infrastructure Services

Docker services are running. To restart them after a reboot:

`docker compose -f docker/local/docker-compose.agent.yml up -d`

| Service | Port | Purpose |
|---------|------|---------|
| MongoDB | 27017 | Primary database |
| Redis | 6379 | Caching + Bull queues |
| ClickHouse | 8123/9000 | Analytics |
| LocalStack | 4566 | S3 emulation |

### Running Services

```bash
pnpm start:api:dev    # API service with hot reload
pnpm start:dashboard  # Dashboard (Vite dev server on port 4201)
pnpm start:worker     # Background worker (only needed when testing workflow triggers)
```

Key gotchas:
- The Dashboard Vite dev server runs on **port 4201** (configured in `apps/dashboard/vite.config.ts`)
- The Worker service must be running when testing the triggering of a workflow notification in Novu, otherwise can be skipped.


Run `pnpm build` before starting services **only** if you made changes to the `libs/`, `packages/` or `enterprise/` folder.

### Dashboard interaction

A default user and organization are pre-seeded. Sign in at `http://localhost:4201/auth/sign-in` with these credentials — no signup or org creation is needed:

| Field        | Value                |
|--------------|----------------------|
| Email        | `agent@novu.co`      |
| Password     | `Agent123!@#`        |
| Organization | `Agent Organization` |

Do not go through the onboarding flow unless explicitly requested.

### Linting

`pnpm check` runs Biome across the monorepo. Pre-existing warnings/errors are expected.

### Testing

- API E2E tests: see `.cursor/skills/run-api-e2e-tests/SKILL.md`
- Dashboard E2E: `cd apps/dashboard && pnpm test:e2e`
- API unit tests: `cd apps/api && pnpm test`

## Creating Pull Requests

Follow the Conventional Commits specification. Include a Linear ticket ID when available.

Format: `feat(scope): Add fancy new feature fixes NOV-123`

Scopes: `dashboard`, `api-service`, `worker`, `shared`, `js`, `react`, `react-native`, `nextjs`, `providers`, `root`, `application-generic`

### Enterprise Packages (Git Submodule)

The `.source` folder is a **git submodule** pointing to the `novuhq/packages-enterprise` repository. When changes are made inside this submodule or `enterprise/packages` folder (which contains symlinked folders to the submodule), both repositories must be updated:

1. **Create a branch in the submodule** following the same Conventional Commits naming convention (e.g., `feat/scope-description-fixes-NOV-123`).
2. **Commit and push** the enterprise changes to that branch in the `novuhq/packages-enterprise` remote (run `git push` from inside the `.source` directory).
3. **Create a PR in the enterprise repository** using the `--repo` flag from the workspace root (do NOT `cd` into the submodule):
   ```bash
   gh pr create --repo novuhq/packages-enterprise --head <branch-name> --base next --title "..." --body "..."
   ```
   If this fails due to permissions, provide the user with a link to create the PR manually:
   ```
   https://github.com/novuhq/packages-enterprise/compare/next...<branch-name>
   ```
4. **Create a matching branch in the main repository** with the same name.
5. **Commit the updated submodule reference** (the changed pointer in `enterprise/`) along with any other main-repo changes to that branch.
6. **Push the main repository branch** and **create a PR** using `gh pr create`. Mention in the PR body that there is a corresponding enterprise branch that needs a PR in `novuhq/packages-enterprise` and include the compare URL from step 3.

Both PRs must follow the conventions from the "Creating Pull Requests" section above (Conventional Commits format, proper scope, Linear ticket ID when available).
