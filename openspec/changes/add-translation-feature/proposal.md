# Change: Add AI-Powered Translation Feature

## Why

Novu's translation feature is locked behind enterprise licensing (`@novu/ee-translation`). ReNovu needs to unlock this functionality for self-hosted deployments while adding AI-powered automatic translation via OpenAI to reduce manual translation effort.

## What Changes

- **NEW:** `packages/translation` - Open-source translation package replacing `@novu/ee-translation`
- **NEW:** `TranslationSettingsEntity` - Organization-level OpenAI API key and locale configuration
- **NEW:** AI translation services - OpenAI integration with variable tokenization and HTML validation
- **NEW:** Dashboard Translation Settings page under Settings menu
- **MODIFIED:** API usecases - Replace enterprise module imports with new package
- **MODIFIED:** Dashboard hooks - Remove enterprise/self-hosted guards for translation

## Impact

### Affected Specs
- `translation` (new capability)

### Affected Code

**New Package:**
- `packages/translation/` - Complete new package (~20 files)

**API Modifications:**
- `apps/api/src/app.module.ts` - Import new TranslationModule
- `apps/api/src/app/workflows-v2/usecases/patch-workflow/` - Use new ManageTranslations
- `apps/api/src/app/workflows-v1/usecases/create-workflow/` - Use new ManageTranslations
- `apps/api/src/app/workflows-v1/usecases/update-workflow/` - Use new ManageTranslations
- `apps/api/src/app/workflows-v1/usecases/delete-workflow/` - Use new DeleteTranslationGroup
- `apps/api/src/app/layouts-v2/usecases/upsert-layout/` - Use new ManageTranslations
- `apps/api/src/app/layouts-v2/usecases/delete-layout/` - Use new DeleteTranslationGroup
- `apps/api/src/app/workflows-v2/usecases/sync-to-environment/` - Use new PublishTranslationGroup
- `apps/api/src/app/layouts-v2/usecases/sync-to-environment/` - Use new PublishTranslationGroup
- `apps/api/src/app/workflows-v2/usecases/duplicate-workflow/` - Use new DuplicateLocales
- `apps/api/src/app/layouts-v2/usecases/duplicate-layout/` - Use new DuplicateLocales

**Dashboard Modifications:**
- `apps/dashboard/src/pages/settings/` - New translation-settings.tsx
- `apps/dashboard/src/components/settings/translation/` - New components
- `apps/dashboard/src/hooks/use-is-translation-enabled.ts` - Remove guards
- `apps/dashboard/src/components/side-navigation/` - Add menu item
- `apps/dashboard/src/routes.ts` - Add translation settings route

**Worker Modifications:**
- Background job processor for translation queue

### Dependencies
- OpenAI API (organization provides API key)
- Existing Novu localization tables (`LocalizationGroup`, `Localization`)

### Risks
- OpenAI API availability affects translation functionality
- Translation quality depends on AI model
- Rate limits may affect batch translation performance

### Mitigations
- Retry with exponential backoff for API failures
- Validation layer catches broken HTML/missing variables
- Progress tracking allows partial completion
- Manual editing always available as fallback
