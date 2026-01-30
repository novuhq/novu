# Implementation Tasks

## 1. Package Foundation

- [x] 1.1 Create `packages/translation` directory structure
- [x] 1.2 Setup `package.json` with dependencies (openai, @nestjs/common)
- [x] 1.3 Setup `tsconfig.json` extending workspace config
- [x] 1.4 Create `TranslationModule` NestJS module
- [x] 1.5 Create `TranslationSettingsEntity` with schema
- [x] 1.6 Create `TranslationSettingsRepository` with CRUD operations
- [x] 1.7 Add encryption/decryption for OpenAI API key storage
- [x] 1.8 Wire package into `apps/api/src/app.module.ts` (Phase 5)
- [x] 1.9 Add package to workspace configuration

## 2. Core Services

- [x] 2.1 Create `VariableTokenizerService`
  - [x] 2.1.1 Implement `tokenize()` - Replace {{var}} with [VAR_X]
  - [x] 2.1.2 Implement `detokenize()` - Restore [VAR_X] to {{var}}
  - [x] 2.1.3 Implement `validate()` - Check no unresolved tokens
- [x] 2.2 Create `TranslationValidatorService`
  - [x] 2.2.1 Implement token validation check
  - [x] 2.2.2 Implement HTML tag balance check
  - [x] 2.2.3 Implement broken tag detection
  - [x] 2.2.4 Implement content length sanity check
- [x] 2.3 Create `OpenAITranslationService`
  - [x] 2.3.1 Implement `translate()` for single content
  - [x] 2.3.2 Implement `translateBatch()` for multiple contents
  - [x] 2.3.3 Implement `testConnection()` for API key validation
  - [x] 2.3.4 Add retry logic with exponential backoff
- [x] 2.4 Write unit tests for VariableTokenizerService
- [x] 2.5 Write unit tests for TranslationValidatorService
- [x] 2.6 Write unit tests for OpenAITranslationService

## 3. Usecases (CQRS Pattern)

- [x] 3.1 Create `ManageTranslations` usecase
  - [x] 3.1.1 Implement enable translation (create LocalizationGroup)
  - [x] 3.1.2 Implement disable translation (soft disable)
  - [x] 3.1.3 Signal for auto-translate jobs on first enable (placeholder for Phase 7)
- [x] 3.2 Create `DeleteTranslationGroup` usecase
  - [x] 3.2.1 Delete LocalizationGroup and child Localizations
- [x] 3.3 Create `PublishTranslationGroup` usecase
  - [x] 3.3.1 Copy LocalizationGroup across environments
  - [x] 3.3.2 Copy child Localizations to target environment
- [x] 3.4 Create `DuplicateLocales` usecase
  - [x] 3.4.1 Clone LocalizationGroup for duplicated resource
  - [x] 3.4.2 Clone child Localizations for new resource
- [x] 3.5 Create `AutoTranslate` usecase (new)
  - [x] 3.5.1 Extract translatable content from resource
  - [x] 3.5.2 Call OpenAI service for each target locale
  - [x] 3.5.3 Store translated content in Localizations
  - [x] 3.5.4 Handle validation failures and retry
- [x] 3.6 Write unit tests for all usecases

## 4. API Controllers

- [x] 4.1 Create `TranslationSettingsController`
  - [x] 4.1.1 GET /translation-settings - Fetch org settings
  - [x] 4.1.2 PUT /translation-settings - Save org settings
  - [x] 4.1.3 POST /translation-settings/test - Test API key
  - [x] 4.1.4 DELETE /translation-settings - Clear settings
- [x] 4.2 Create `TranslationController` endpoints (if not existing)
  - [x] 4.2.1 POST /translations/auto-translate - Trigger translation
  - [x] 4.2.2 GET /translations/status/:jobId - Check job status
- [x] 4.3 Add DTOs and validation
- [ ] 4.4 Write E2E tests for controllers

## 5. API Integration

- [x] 5.1 Update `apps/api/src/app.module.ts`
  - [x] 5.1.1 Import TranslationModule (replace EE conditional)
- [x] 5.2 Update workflow usecases
  - [x] 5.2.1 `patch-workflow.usecase.ts` - Inject ManageTranslations
  - [x] 5.2.2 `create-workflow.usecase.ts` - Inject ManageTranslations
  - [x] 5.2.3 `update-workflow.usecase.ts` - Inject ManageTranslations
  - [x] 5.2.4 `delete-workflow.usecase.ts` - Inject DeleteTranslationGroup
  - [x] 5.2.5 `sync-to-environment.usecase.ts` - Inject PublishTranslationGroup
  - [x] 5.2.6 `duplicate-workflow.usecase.ts` - Inject DuplicateLocales
- [x] 5.3 Update layout usecases
  - [x] 5.3.1 `upsert-layout.usecase.ts` - Inject ManageTranslations
  - [x] 5.3.2 `delete-layout.use-case.ts` - Inject DeleteTranslationGroup
  - [x] 5.3.3 `layout-sync-to-environment.usecase.ts` - Inject PublishTranslationGroup
  - [x] 5.3.4 `duplicate-layout.use-case.ts` - Inject DuplicateLocales
- [x] 5.4 Remove enterprise guards from all updated files
- [ ] 5.5 Write integration tests (TODO: requires additional usecases: DiffTranslationGroups, Translate)

## 6. Dashboard

- [x] 6.1 Create/Enhance Translation Settings UI (TranslationSettingsDrawer)
  - [x] 6.1.1 `components/translations/translation-settings-drawer.tsx` (enhanced existing)
  - [x] 6.1.2 OpenAI API key form with mask/reveal (SecretInput)
  - [x] 6.1.3 Model selector dropdown (gpt-4o-mini, gpt-4o, gpt-4-turbo)
  - [x] 6.1.4 Default locale selector (existing, kept)
  - [x] 6.1.5 Target locales multi-select (existing, kept)
  - [x] 6.1.6 Test connection button with success/failure feedback
  - [x] 6.1.7 Save/clear functionality (enhanced to include OpenAI config)
- [x] 6.2 Create supporting components (integrated in drawer)
  - [x] 6.2.1 OpenAI config section in TranslationSettingsDrawer
  - [x] 6.2.2 Target locales selector (existing LocaleSelect component)
  - [x] 6.2.3 Test connection button with InlineToast feedback
- [x] 6.3 Create API client functions
  - [x] 6.3.1 `api/translation-settings.ts` (already created)
- [x] 6.4 Create hooks
  - [x] 6.4.1 `hooks/use-translation-settings.ts` (already created)
  - [x] 6.4.2 `hooks/use-update-translation-settings.ts` (already created)
  - [x] 6.4.3 `hooks/use-test-translation-connection.ts` (already created)
  - [x] 6.4.4 `hooks/use-delete-translation-settings.ts` (already created)
- [x] 6.5 Update navigation
  - [x] 6.5.1 Route already exists in `routes.ts` (TRANSLATION_SETTINGS)
  - [x] 6.5.2 Added Settings button to Translations page header
- [x] 6.6 Update `use-is-translation-enabled.ts`
  - [x] 6.6.1 Removed `(!IS_SELF_HOSTED || IS_ENTERPRISE)` check
  - [x] 6.6.2 Added `hasOpenAIKeyConfigured` check using `useTranslationSettings`
  - [x] 6.6.3 Updated `translation-list.tsx` with same pattern
  - [x] 6.6.4 Updated `translation-onboarding-page.tsx` with API key config prompt
  - [x] 6.6.5 Updated `translation-list-upgrade-cta.tsx` for self-hosted users
- [ ] 6.7 Write E2E tests for settings page

## 7. Background Jobs

- [x] 7.1 Create translation job queue in worker
  - [x] 7.1.1 Define job interface and queue name (`packages/shared/src/config/job-queue.ts`)
    - Added `TRANSLATION` to `JobTopicNameEnum`
    - Added `TRANSLATION_QUEUE` to `ObservabilityBackgroundTransactionEnum`
    - Added `ITranslationJobData` interface
    - Added `TranslationResourceTypeEnum` and `TranslationJobStatusEnum`
  - [x] 7.1.2 Create job producer (`libs/application-generic/src/services/queues/translation-queue.service.ts`)
    - `TranslationQueueService` extends `QueueBaseService`
    - Exponential backoff (5s initial, 5 attempts)
    - Organization-level groupId for rate limiting
  - [x] 7.1.3 Create job consumer (`apps/worker/src/app/translation/`)
    - `TranslationWorker` extends `TranslationWorkerService`
    - NewRelic transaction tracing
    - Context propagation via AsyncLocalStorage
    - Organization validation before processing
- [x] 7.2 Implement job processor
  - [x] 7.2.1 Fetch resource content (via job data payload)
  - [x] 7.2.2 Call OpenAI translation service (via `AutoTranslate` usecase)
  - [x] 7.2.3 Validate and store results (handled by `AutoTranslate`)
  - [x] 7.2.4 Handle errors and retry (exponential backoff, error logging)
- [ ] 7.3 Add progress tracking (Future enhancement)
  - [ ] 7.3.1 Store job progress in Redis
  - [ ] 7.3.2 WebSocket updates for real-time status
- [ ] 7.4 Write tests for job processor

### Additional Phase 7 Deliverables:
- [x] 7.5 Base services in `libs/application-generic`
  - `TranslationWorkerService` - Base worker class
  - `TranslationQueueService` - Queue producer service
  - `ITranslationDataDto` - Job data DTO
  - `getTranslationWorkerOptions()` - Worker config (50 concurrency, 180s lock)
- [x] 7.6 `EnqueueTranslation` usecase in `packages/translation`
  - Generates unique job reference IDs
  - Maps resource types between packages
  - Gracefully handles missing queue service
- [x] 7.7 Controller async mode support
  - `POST /translations/auto-translate?async=true` for background processing
  - Returns `jobReferenceId` for status polling
- [x] 7.8 Worker module registration
  - `TranslationWorkerModule` in `apps/worker`
  - Updated `worker-init.config.ts` with TranslationWorker
  - Updated `app.module.ts` to include TranslationWorkerModule

## 8. Documentation & Cleanup

- [x] 8.1 Update CLAUDE.md with translation package info
- [x] 8.2 Add README to packages/translation
- [ ] 8.3 Verify all tests pass (requires pnpm install - blocked by @novu/ee-auth dependency)
- [ ] 8.4 Run linter and fix issues (requires pnpm install - blocked by @novu/ee-auth dependency)
- [x] 8.5 Final code review
  - Code review completed with superpowers:code-reviewer agent
  - Critical security issues identified and fixed:
    - Prompt injection protection for customInstructions
    - Type safety fix for openaiModel enum
    - Non-null assertion removal in dashboard hooks
  - Rating: 7.5/10 (solid implementation, production-ready)

## Known Deferred Items

These items are deferred to future iterations:

1. **Test Coverage Gaps** (requires pnpm install working):
   - E2E tests for controllers (4.4)
   - Integration tests (5.5)
   - E2E tests for settings page (6.7)
   - Tests for job processor (7.4)

2. **Future Enhancements** (documented but not critical):
   - Progress tracking with Redis + WebSocket (7.3)
   - Actual token usage tracking from OpenAI response metadata
   - Rate limiting decoration (handled by existing ApiRateLimitInterceptor for cloud deployments)
