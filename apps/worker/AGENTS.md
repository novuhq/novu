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

## Architecture Notes

- Each notification channel (email, SMS, push, in-app, chat) has a dedicated `send-message` usecase.
- Usecases follow the CQRS pattern: `execute(command: CommandClass)` returning a typed result.
- Job failure handling and retry logic are defined at the queue level in `libs/application-generic`.

## Boundaries

### Never
- Duplicate retry logic or failure handling inside worker use-cases — configure it at the queue level in `libs/application-generic`
- Share send-message logic across channels — keep each channel's use-case isolated
- Reference `apps/web` or `libs/embed` — those projects have been removed from this repo

### Ask First
- Before adding a new Bull queue or changing queue configuration
- Before introducing a new channel-level use-case that may affect step execution ordering

See [root AGENTS.md](../../AGENTS.md) for monorepo-wide boundaries.
