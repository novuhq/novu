# Project Context

## Purpose
ReNovu is a fork of [Novu](https://github.com/novuhq/novu) - an open-source notification infrastructure platform. ReNovu extends Novu with additional features (like AI-powered translation) while maintaining compatibility with upstream releases for regular merges.

**Key Goals:**
- Provide unified API for multi-channel notifications (email, SMS, push, in-app, chat)
- Offer embeddable inbox component and visual workflow builder
- Unlock enterprise features for self-hosted deployments
- Minimize modifications to Novu core for easy upstream merges

## Tech Stack

### Backend
- **Runtime:** Node.js 20+
- **Language:** TypeScript (strict mode)
- **Framework:** NestJS
- **Database:** MongoDB
- **Cache/Queue:** Redis, Bull queues
- **API Style:** REST + WebSocket for real-time

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **State Management:** TanStack Query
- **UI Components:** Radix UI
- **Styling:** Tailwind CSS

### Infrastructure
- **Monorepo:** Nx workspace with pnpm workspaces
- **Package Manager:** pnpm 10+
- **Containerization:** Docker Compose for local development

## Project Conventions

### Code Style
- Write concise, technical TypeScript code
- Use functional and declarative programming patterns; avoid classes where possible
- Use descriptive variable names with auxiliary verbs (`isLoading`, `hasError`, `canSubmit`)
- Use lowercase with dashes for directories and files (e.g., `components/auth-wizard`)
- Favor named exports for components
- Add blank lines before return statements
- Prefer interfaces over types (backend), types over interfaces (frontend)

### Architecture Patterns
- **CQRS-style:** Command/query separation in business logic
- **Event-driven:** Message queues for async processing
- **Microservices-ready:** Each app deployable independently
- **Plugin system:** Extensible provider integrations
- **Multi-tenant:** Organization/environment isolation
- **Feature isolation:** ReNovu extensions in separate packages to minimize merge conflicts

### Naming Conventions
- **Usecases:** `verb-noun.usecase.ts` (e.g., `create-workflow.usecase.ts`)
- **Commands:** `verb-noun.command.ts` (e.g., `create-workflow.command.ts`)
- **Controllers:** `noun.controller.ts` (e.g., `workflow.controller.ts`)
- **Entities:** `noun.entity.ts` (e.g., `workflow.entity.ts`)
- **Repositories:** `noun.repository.ts` (e.g., `workflow.repository.ts`)

### Testing Strategy
- **Unit tests:** Jest for services and usecases
- **E2E tests:** Located in each app's test directory
- **API tests:** `cd apps/api && pnpm test:e2e:novu-v2`
- **Dashboard tests:** `cd apps/dashboard && pnpm test:e2e`
- Coverage expected for all new features

### Git Workflow
- **Main branch:** `next` (tracks upstream Novu)
- **Feature branches:** `feature/<name>` for new work
- **Commit format:** `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
  - Scopes: `dashboard`, `api`, `worker`, `shared`, `translation`, etc.
- **PR strategy:** Small, focused PRs with clear descriptions

## Domain Context

### Notification Infrastructure
- **Workflows:** Define notification logic with steps (email, SMS, push, etc.)
- **Steps:** Individual actions within workflows with templates
- **Subscribers:** End-users who receive notifications
- **Environments:** Isolated contexts (dev, staging, prod) per organization
- **Providers:** Third-party services for delivery (SendGrid, Twilio, FCM, etc.)

### Key Entities
- `Organization` - Top-level tenant
- `Environment` - Isolated context within organization
- `Workflow` - Notification workflow definition
- `Step` - Individual step within workflow
- `Subscriber` - Notification recipient
- `Message` - Sent notification instance
- `Layout` - Reusable template wrapper
- `LocalizationGroup` - Translation container for workflow/layout
- `Localization` - Individual translation per locale

### Translation System (ReNovu Extension)
- `TranslationSettings` - Organization-level AI translation config
- Translatable content: user-facing notification text
- Non-translatable: variables, slugs, technical config

## Important Constraints

### Upstream Compatibility
- **Critical:** Minimize changes to `libs/dal` (Novu core data layer)
- **Critical:** Minimize changes to existing entity schemas
- **Preferred:** New features in isolated packages (`packages/*`)
- **Preferred:** ReNovu extensions clearly separated from Novu code

### Technical Constraints
- Node.js 20 required (engines.node: ">=20 <21")
- pnpm 10+ required as package manager
- MongoDB and Redis required for local development
- All encryption uses AES-256 for sensitive data

### Performance Requirements
- API response time: <200ms for common operations
- Background jobs: Bull queues with exponential backoff
- Real-time updates: WebSocket for live status

## External Dependencies

### Core Services
- **MongoDB:** Primary database
- **Redis:** Caching and job queue backend
- **Bull:** Background job processing

### Optional Integrations
- **OpenAI API:** AI-powered translation (ReNovu)
- **50+ Providers:** Email, SMS, push, chat delivery services

### Development Tools
- **Nx:** Monorepo orchestration
- **Vite:** Frontend build tool
- **Jest:** Testing framework
- **ESLint/Prettier:** Code formatting

## Key File Locations

| Purpose | Location |
|---------|----------|
| API routes | `apps/api/src/app/` |
| Dashboard components | `apps/dashboard/src/components/` |
| Shared types | `packages/shared/src/` |
| Database models | `libs/dal/src/repositories/` |
| Provider implementations | `packages/providers/src/` |
| ReNovu extensions | `packages/translation/` (new) |
