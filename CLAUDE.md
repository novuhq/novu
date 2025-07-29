# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Novu is a notification infrastructure platform built as a **monorepo using Nx** with **pnpm workspaces**. It provides a unified API for multi-channel notifications (email, SMS, push, in-app, chat) with an embeddable inbox component, workflow engine, and comprehensive provider ecosystem.

## Architecture

**Technology Stack:**
- **Backend**: Node.js + TypeScript, NestJS, MongoDB, Redis, Bull queues
- **Frontend**: React 18 + TypeScript, Vite, TanStack Query, Radix UI, Tailwind CSS
- **Monorepo**: Nx workspace with pnpm workspaces

**Key Applications** (`apps/`):
- `api` - Core NestJS backend service (REST API, authentication, business logic)
- `dashboard` - Modern React dashboard built with Vite (primary UI)
- `web` - Legacy React dashboard (CRA-based, maintained for compatibility)
- `worker` - Background job processing service (Bull queues)  
- `ws` - WebSocket service for real-time updates
- `webhook` - Webhook delivery service
- `inbound-mail` - Email parsing service

**Key Libraries** (`libs/`):
- `application-generic` - Common business logic, CQRS patterns, auth decorators
- `dal` - Data Access Layer (MongoDB models, repositories)
- `design-system` - Shared UI components and themes
- `internal-sdk` - TypeScript SDK with auto-generated types

**NPM Packages** (`packages/`):
- `framework` - Core notification framework and workflow engine
- `js` - Client-side JavaScript SDK
- `react` - React notification components (inbox, preferences)
- `providers` - Channel integrations (email, SMS, push, chat providers)
- `shared` - Common types, constants, utilities

## Development Commands

**🚀 Quick Start:**
```bash
# Complete setup (first time)
pnpm setup:project

# Interactive development helper (most useful!)
pnpm start  # or: pnpm jarvis
```

**🏃 Running Services:**
```bash
# Core development stack
pnpm start:api:dev    # API service with hot reload
pnpm start:dashboard  # New React dashboard  
pnpm start:web       # Legacy web app
pnpm start:worker    # Background worker
pnpm start:ws        # WebSocket service
```

**🏗️ Building:**
```bash
pnpm build:v2        # Build core v2 services (recommended)
pnpm build          # Build all projects
pnpm build:api      # Build specific service
```

**🧪 Testing:**
```bash
# API tests
cd apps/api && pnpm test              # Unit tests
cd apps/api && pnpm test:e2e:novu-v2  # E2E tests

# Frontend E2E tests
cd apps/web && pnpm test:e2e         # Playwright tests
cd apps/dashboard && pnpm test:e2e   # Dashboard E2E tests
```

**🔍 Code Quality:**
```bash
pnpm lint           # Lint entire codebase
pnpm typecheck      # Run TypeScript checks
```

## Code Conventions

**From .cursor/rules/novu.mdc:**
- Write concise, technical TypeScript code with accurate examples
- Use functional and declarative programming patterns; avoid classes
- Use descriptive variable names with auxiliary verbs (isLoading, hasError)
- Use lowercase with dashes for directories and files (e.g., components/auth-wizard)
- Favor named exports for components
- Prefer interfaces over types (backend), types over interfaces (frontend)
- Add blank lines before return statements
- Import "motion-react" from "motion/react"
- Git commits: use proper scope (dashboard, web, api, worker, shared, etc.)

**Dashboard-specific (.cursor/rules/dashboard.mdc):**
- Do not attempt to build/run dashboard (user will be running it)
- Use lowercase with dashes for directories and files
- Favor named exports for components

## Project Structure Insights

**Enterprise Architecture:**
- Multi-tenant with organization/environment isolation
- Enterprise features conditionally loaded from `/enterprise` folder
- RBAC (Role-Based Access Control) throughout

**Provider System:**
- Plugin-based architecture for notification channels
- Support for 50+ providers across email, SMS, push, chat
- Easy integration of custom providers

**Workflow Engine:**
- Visual workflow builder with step-based configuration
- Conditional logic, delays, and multi-channel orchestration
- Template engine with Handlebars and LiquidJS support

**Key File Locations:**
- API routes: `apps/api/src/app/`
- Dashboard components: `apps/dashboard/src/components/`
- Shared types: `packages/shared/src/`
- Database models: `libs/dal/src/repositories/`
- Provider implementations: `packages/providers/src/`

## Development Tips

1. **Use Jarvis CLI** (`pnpm start`) for guided development - it handles service orchestration
2. **Check diagnostics** in IDE before running builds - saves time
3. **Focus on specific apps** - the monorepo structure allows independent development
4. **Enterprise features** are in `/enterprise` folder and `apps/*/src/ee/` directories
5. **Database changes** require updates to both DAL models and any migrations
6. **Provider development** follows a consistent interface pattern in `packages/providers/`

## Architecture Patterns

- **CQRS-style** command/query separation in business logic
- **Event-driven** architecture with message queues
- **Microservices-ready** - each app can be deployed independently  
- **Plugin system** for extensible provider integrations
- **Feature flags** for enterprise functionality
- **Multi-environment** support (dev, staging, prod per organization)

## Important Notes

- **Node.js 20** required (`engines.node: ">=20 <21"`)
- **pnpm 10+** required as package manager
- **MongoDB & Redis** required for local development (available via Docker Compose)
- **Environment files** are set up automatically by setup scripts
- **Dashboard is primary UI** - web app is legacy but still maintained

## Development Guidance

- No need to run npm typecheck commands, as we will see it ourself