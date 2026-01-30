# Implementation Tasks

## 1. Package Foundation

- [ ] 1.1 Create `packages/translation` directory structure
- [ ] 1.2 Setup `package.json` with dependencies (openai, @nestjs/common)
- [ ] 1.3 Setup `tsconfig.json` extending workspace config
- [ ] 1.4 Create `TranslationModule` NestJS module
- [ ] 1.5 Create `TranslationSettingsEntity` with schema
- [ ] 1.6 Create `TranslationSettingsRepository` with CRUD operations
- [ ] 1.7 Add encryption/decryption for OpenAI API key storage
- [ ] 1.8 Wire package into `apps/api/src/app.module.ts`
- [ ] 1.9 Add package to workspace configuration

## 2. Core Services

- [ ] 2.1 Create `VariableTokenizerService`
  - [ ] 2.1.1 Implement `tokenize()` - Replace {{var}} with [VAR_X]
  - [ ] 2.1.2 Implement `detokenize()` - Restore [VAR_X] to {{var}}
  - [ ] 2.1.3 Implement `validate()` - Check no unresolved tokens
- [ ] 2.2 Create `TranslationValidatorService`
  - [ ] 2.2.1 Implement token validation check
  - [ ] 2.2.2 Implement HTML tag balance check
  - [ ] 2.2.3 Implement broken tag detection
  - [ ] 2.2.4 Implement content length sanity check
- [ ] 2.3 Create `OpenAITranslationService`
  - [ ] 2.3.1 Implement `translate()` for single content
  - [ ] 2.3.2 Implement `translateBatch()` for multiple contents
  - [ ] 2.3.3 Implement `testConnection()` for API key validation
  - [ ] 2.3.4 Add retry logic with exponential backoff
- [ ] 2.4 Write unit tests for VariableTokenizerService
- [ ] 2.5 Write unit tests for TranslationValidatorService
- [ ] 2.6 Write unit tests for OpenAITranslationService

## 3. Usecases (EE Replacement)

- [ ] 3.1 Create `ManageTranslations` usecase
  - [ ] 3.1.1 Implement enable translation (create LocalizationGroup)
  - [ ] 3.1.2 Implement disable translation (soft disable)
  - [ ] 3.1.3 Queue auto-translate jobs on first enable
- [ ] 3.2 Create `DeleteTranslationGroup` usecase
  - [ ] 3.2.1 Delete LocalizationGroup and child Localizations
- [ ] 3.3 Create `PublishTranslationGroup` usecase
  - [ ] 3.3.1 Copy LocalizationGroup across environments
  - [ ] 3.3.2 Copy child Localizations to target environment
- [ ] 3.4 Create `DuplicateLocales` usecase
  - [ ] 3.4.1 Clone LocalizationGroup for duplicated resource
  - [ ] 3.4.2 Clone child Localizations for new resource
- [ ] 3.5 Create `AutoTranslate` usecase (new)
  - [ ] 3.5.1 Extract translatable content from resource
  - [ ] 3.5.2 Call OpenAI service for each target locale
  - [ ] 3.5.3 Store translated content in Localizations
  - [ ] 3.5.4 Handle validation failures and retry
- [ ] 3.6 Write unit tests for all usecases

## 4. API Controllers

- [ ] 4.1 Create `TranslationSettingsController`
  - [ ] 4.1.1 GET /translation-settings - Fetch org settings
  - [ ] 4.1.2 PUT /translation-settings - Save org settings
  - [ ] 4.1.3 POST /translation-settings/test - Test API key
  - [ ] 4.1.4 DELETE /translation-settings - Clear settings
- [ ] 4.2 Create `TranslationController` endpoints (if not existing)
  - [ ] 4.2.1 POST /translations/auto-translate - Trigger translation
  - [ ] 4.2.2 GET /translations/status/:jobId - Check job status
- [ ] 4.3 Add DTOs and validation
- [ ] 4.4 Write E2E tests for controllers

## 5. API Integration

- [ ] 5.1 Update `apps/api/src/app.module.ts`
  - [ ] 5.1.1 Import TranslationModule (replace EE conditional)
- [ ] 5.2 Update workflow usecases
  - [ ] 5.2.1 `patch-workflow.usecase.ts` - Inject ManageTranslations
  - [ ] 5.2.2 `create-workflow.usecase.ts` - Inject ManageTranslations
  - [ ] 5.2.3 `update-workflow.usecase.ts` - Inject ManageTranslations
  - [ ] 5.2.4 `delete-workflow.usecase.ts` - Inject DeleteTranslationGroup
  - [ ] 5.2.5 `sync-to-environment.usecase.ts` - Inject PublishTranslationGroup
  - [ ] 5.2.6 `duplicate-workflow.usecase.ts` - Inject DuplicateLocales
- [ ] 5.3 Update layout usecases
  - [ ] 5.3.1 `upsert-layout.usecase.ts` - Inject ManageTranslations
  - [ ] 5.3.2 `delete-layout.use-case.ts` - Inject DeleteTranslationGroup
  - [ ] 5.3.3 `layout-sync-to-environment.usecase.ts` - Inject PublishTranslationGroup
  - [ ] 5.3.4 `duplicate-layout.use-case.ts` - Inject DuplicateLocales
- [ ] 5.4 Remove enterprise guards from all updated files
- [ ] 5.5 Write integration tests

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
