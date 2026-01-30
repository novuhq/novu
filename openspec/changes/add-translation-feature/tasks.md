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

- [ ] 6.1 Create Translation Settings page
  - [ ] 6.1.1 `pages/settings/translation-settings.tsx`
  - [ ] 6.1.2 OpenAI API key form with mask/reveal
  - [ ] 6.1.3 Model selector dropdown
  - [ ] 6.1.4 Default locale selector
  - [ ] 6.1.5 Target locales multi-select
  - [ ] 6.1.6 Test connection button
  - [ ] 6.1.7 Save/clear functionality
- [ ] 6.2 Create supporting components
  - [ ] 6.2.1 `components/settings/translation/openai-config-form.tsx`
  - [ ] 6.2.2 `components/settings/translation/target-locales-selector.tsx`
  - [ ] 6.2.3 `components/settings/translation/test-connection-button.tsx`
- [ ] 6.3 Create API client functions
  - [ ] 6.3.1 `api/translation-settings.ts`
- [ ] 6.4 Create hooks
  - [ ] 6.4.1 `hooks/use-translation-settings.ts`
  - [ ] 6.4.2 `hooks/use-save-translation-settings.ts`
- [ ] 6.5 Update navigation
  - [ ] 6.5.1 Add route to `routes.ts`
  - [ ] 6.5.2 Add menu item to settings navigation
- [ ] 6.6 Update `use-is-translation-enabled.ts`
  - [ ] 6.6.1 Remove `(!IS_SELF_HOSTED || IS_ENTERPRISE)` check
  - [ ] 6.6.2 Add `hasOpenAIKeyConfigured` check
- [ ] 6.7 Write E2E tests for settings page

## 7. Background Jobs

- [ ] 7.1 Create translation job queue in worker
  - [ ] 7.1.1 Define job interface and queue name
  - [ ] 7.1.2 Create job producer (queue translations)
  - [ ] 7.1.3 Create job consumer (process translations)
- [ ] 7.2 Implement job processor
  - [ ] 7.2.1 Fetch resource content
  - [ ] 7.2.2 Call OpenAI translation service
  - [ ] 7.2.3 Validate and store results
  - [ ] 7.2.4 Handle errors and retry
- [ ] 7.3 Add progress tracking
  - [ ] 7.3.1 Store job progress in Redis
  - [ ] 7.3.2 WebSocket updates for real-time status
- [ ] 7.4 Write tests for job processor

## 8. Documentation & Cleanup

- [ ] 8.1 Update CLAUDE.md with translation package info
- [ ] 8.2 Add README to packages/translation
- [ ] 8.3 Verify all tests pass
- [ ] 8.4 Run linter and fix issues
- [ ] 8.5 Final code review
