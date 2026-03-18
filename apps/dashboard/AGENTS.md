# Dashboard

Modern React web UI for managing Novu — the primary user-facing interface.

## Stack

- **Framework**: React 19 + Vite + TypeScript
- **UI**: Radix UI, Tailwind CSS, shadcn/ui
- **Data fetching**: TanStack Query
- **Routing**: React Router
- **Animation**: motion/react (import from `"motion/react"`)
- **Port**: 4201 (configured in `apps/dashboard/vite.config.ts`)

## Running

Do **not** build or run the dashboard from within agent tasks — the user will already have it running. To check types, use the linter results visible in Cursor diagnostics.

```bash
pnpm start:dashboard   # Vite dev server on port 4201
```

## Testing

```bash
cd apps/dashboard && pnpm test:e2e   # Playwright E2E tests
```

## Code Quality

```bash
cd apps/dashboard && pnpm check   # Biome lint + format
```

## Dashboard Interaction (when using browser automation)

After creating a new user:
1. Create a new organization when prompted.
2. After submitting the org name, navigate directly to `http://localhost:4201`.
3. You will land on the workflows page — skip the full onboarding flow unless explicitly requested.

## Key Directories

```
apps/dashboard/src/components/   # Shared UI components
apps/dashboard/src/pages/        # Route-level page components
apps/dashboard/src/hooks/        # Custom React hooks
apps/dashboard/src/api/          # API client and query definitions
apps/dashboard/src/ee/           # Enterprise-only features
```
