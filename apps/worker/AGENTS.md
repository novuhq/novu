# Worker Service

Background job processor for the Novu platform — consumes Bull queues and executes notification workflows.

## Stack

- **Framework**: NestJS
- **Queue**: Bull + Redis
- **Analytics**: ClickHouse (workflow/step run traces, execution details)
- **Scheduling**: cron-parser

## Running

```bash
pnpm start:worker
```

The worker must be running when **testing workflow notification triggering**. For most other development tasks (dashboard UI, API endpoints not involving notifications) it can be skipped.

## Testing

```bash
cd apps/worker && pnpm test   # Mocha unit tests
```

## Code Quality

```bash
cd apps/worker && pnpm check   # Biome lint + format
```

## Key Directories

```
apps/worker/src/app/workflow/usecases/   # Workflow step execution usecases
apps/worker/src/app/workflow/services/   # Queue consumers and job handlers
```

<!-- Coding conventions: see .cursor/rules/worker.mdc -->
<!-- Monorepo-wide boundaries: see root AGENTS.md -->
