# Translation Feature Design - ReNovu

**Date:** 2026-01-31
**Status:** Draft
**Branch:** `feature/translation-unlock`

## Overview

This document describes the design for unlocking and replacing the enterprise translation feature (`@novu/ee-translation`) with an open-source implementation powered by OpenAI for automatic translations.

## Goals

1. **Unlock translation** for self-hosted ReNovu deployments
2. **Full parity** with enterprise translation functionality
3. **AI-powered** automatic translation via OpenAI API
4. **Minimal core changes** to facilitate upstream Novu merges
5. **Organization-level** API key management

## Non-Goals

- Platform/dashboard localization (future: next-i18n)
- Support for translation providers other than OpenAI (future extensibility possible)
- Real-time collaborative translation editing

---

## Architecture

### Package Structure

```
packages/translation/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                              # Public exports
│   ├── translation.module.ts                 # NestJS module
│   │
│   ├── dal/                                  # Data Access Layer (isolated)
│   │   ├── translation-settings.entity.ts
│   │   ├── translation-settings.schema.ts
│   │   └── translation-settings.repository.ts
│   │
│   ├── usecases/                             # Business logic (CQRS pattern)
│   │   ├── manage-translations/
│   │   │   ├── manage-translations.usecase.ts
│   │   │   └── manage-translations.command.ts
│   │   ├── delete-translation-group/
│   │   │   ├── delete-translation-group.usecase.ts
│   │   │   └── delete-translation-group.command.ts
│   │   ├── publish-translation-group/
│   │   │   ├── publish-translation-group.usecase.ts
│   │   │   └── publish-translation-group.command.ts
│   │   ├── duplicate-locales/
│   │   │   ├── duplicate-locales.usecase.ts
│   │   │   └── duplicate-locales.command.ts
│   │   └── auto-translate/
│   │       ├── auto-translate.usecase.ts
│   │       └── auto-translate.command.ts
│   │
│   ├── services/
│   │   ├── openai-translation.service.ts     # OpenAI API integration
│   │   ├── variable-tokenizer.service.ts     # {{var}} → [VAR_X] handling
│   │   └── translation-validator.service.ts  # HTML/token validation
│   │
│   └── controllers/
│       ├── translation.controller.ts         # REST API endpoints
│       └── translation-settings.controller.ts # Settings endpoints
```

### Data Models

#### New: TranslationSettingsEntity

```typescript
// Collection: "translation_settings"
// Location: packages/translation/src/dal/

interface TranslationSettingsEntity {
  _id: ObjectId;
  _organizationId: string;          // Indexed, unique
  openaiApiKey: string;             // AES-256 encrypted
  openaiModel: string;              // "gpt-4o-mini" | "gpt-4o" | "gpt-4-turbo"
  defaultLocale: string;            // "en_US"
  targetLocales: string[];          // ["es_ES", "fr_FR", "de_DE"]
  createdAt: Date;
  updatedAt: Date;
}
```

#### Existing (No Changes)

- `LocalizationGroupEntity` - Groups translations by resource (workflow/layout)
- `LocalizationEntity` - Individual translation content per locale

---

## Usecase Contracts

### ManageTranslations

Enable/disable translations on resources.

```typescript
interface ManageTranslationsCommand {
  enabled: boolean;
  resourceId: string;
  resourceType: LocalizationResourceEnum;  // 'workflow' | 'layout'
  organizationId: string;
  environmentId: string;
  userId: string;
  session?: ClientSession;
  resourceEntity?: WorkflowDto | LayoutDto;
}
// Returns: Promise<void>
```

**Behavior:**
- If `enabled=true` (first time): Creates LocalizationGroup, queues auto-translate jobs
- If `enabled=false`: Soft-disables (keeps data for re-enable)

### DeleteTranslationGroup

Cleanup when resource is deleted.

```typescript
interface DeleteTranslationGroupCommand {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  organizationId: string;
  environmentId: string;
  userId: string;
}
// Returns: Promise<void>
```

### PublishTranslationGroup

Sync translations across environments.

```typescript
interface PublishTranslationGroupCommand {
  user: { organizationId: string; environmentId: string; _id: string };
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
}
// Returns: Promise<void>
```

### DuplicateLocales

Copy translations when duplicating resource.

```typescript
interface DuplicateLocalesCommand {
  sourceResourceId: string;
  sourceResourceType: LocalizationResourceEnum;
  targetResourceId: string;
  organizationId: string;
  environmentId: string;
  userId: string;
}
// Returns: Promise<void>
```

---

## OpenAI Integration

### Translation Service

```typescript
@Injectable()
export class OpenAITranslationService {
  async translate(request: TranslateRequest): Promise<TranslateResponse>;
  async translateBatch(request: BatchTranslateRequest): Promise<BatchTranslateResponse>;
  async testConnection(organizationId: string): Promise<{ success: boolean; error?: string }>;
}

interface TranslateRequest {
  organizationId: string;
  content: string;
  sourceLocale: string;
  targetLocale: string;
  contentType: 'plain' | 'html';
}

interface TranslateResponse {
  translatedContent: string;
  sourceLocale: string;
  targetLocale: string;
  tokensUsed: number;
}
```

### Prompt Template

```
Translate the following content from {sourceLocale} to {targetLocale}.

Rules:
- Preserve ALL HTML tags and attributes exactly as-is
- Preserve [VAR_X] tokens exactly as-is (do not translate)
- Only translate visible text content
- Maintain the same structure and formatting
- Do not add or remove any HTML elements

Content:
{content}

Translated content:
```

---

## Variable Handling

Use token replacement (pre/post processing) to guarantee variable preservation.

```typescript
@Injectable()
export class VariableTokenizerService {
  tokenize(content: string): TokenizeResult;
  detokenize(content: string, variableMap: Map<string, string>): string;
  validate(content: string): ValidationResult;
}
```

**Flow:**
```
Input:  "Hi {{user.name}}, your order {{orderId}} is ready!"
     ↓ tokenize()
Tokens: "Hi [VAR_1], your order [VAR_2] is ready!"
     ↓ OpenAI translate (Spanish)
Output: "¡Hola [VAR_1], tu pedido [VAR_2] está listo!"
     ↓ detokenize()
Final:  "¡Hola {{user.name}}, tu pedido {{orderId}} está listo!"
```

---

## Validation

```typescript
@Injectable()
export class TranslationValidatorService {
  validate(request: ValidateRequest): ValidationResult;
}
```

**Checks:**
1. All `[VAR_X]` tokens restored
2. HTML tag balance (count match)
3. No broken tags
4. Content length sanity check

**On validation failure:**
- Retry once with stricter prompt
- If still fails, mark locale as "needs manual review"

---

## Translation Trigger Flow

### Hybrid Approach

1. **First Enable:** Auto-translate to all target locales (background jobs)
2. **Content Update:** Mark locales as "outdated", user triggers update on-demand
3. **Manual:** User can trigger translation for specific locale anytime

### Background Jobs

```
User enables translation
        ↓
Extract translatable keys
        ↓
Queue jobs (Bull)
├── { locale: 'es_ES', resourceId: '...' }
├── { locale: 'fr_FR', resourceId: '...' }
└── { locale: 'de_DE', resourceId: '...' }
        ↓
Worker processes → OpenAI API → Store results
        ↓
Dashboard shows progress: "Translating... 2/5 locales"
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| API timeout/rate limit | Retry with exponential backoff (3 attempts) |
| Invalid response (broken HTML) | Retry once with stricter prompt |
| Partial failure (3/5 locales done) | Save successful ones, queue retry for failed |
| API key invalid | Mark org setting as invalid, notify user |
| Out of credits | Surface error in dashboard, pause translation jobs |

---

## Content Scope

### Translate (User-facing content)

| Step Type | Fields |
|-----------|--------|
| Email | subject, body, preheader |
| SMS | body |
| Push | title, body |
| In-App | subject, body, action buttons |
| Chat | body |

### Do NOT Translate

- Variable placeholders: `{{name}}`, `{{orderId}}`
- Workflow/step names
- Step identifiers/slugs
- Technical configuration
- HTML structure/tags (preserve, translate inner text only)

---

## Dashboard Changes

### New Files

```
apps/dashboard/src/
├── pages/settings/translation-settings.tsx
├── components/settings/translation/
│   ├── openai-config-form.tsx
│   ├── target-locales-selector.tsx
│   └── test-connection-button.tsx
├── api/translation-settings.ts
└── hooks/
    ├── use-translation-settings.ts
    └── use-save-translation-settings.ts
```

### Modified Files

| File | Change |
|------|--------|
| `hooks/use-is-translation-enabled.ts` | Remove `(!IS_SELF_HOSTED \|\| IS_ENTERPRISE)` check, add `hasOpenAIKeyConfigured` |
| `components/side-navigation/settings-navigation.tsx` | Add Translation menu item |
| `routes.ts` | Add `SETTINGS_TRANSLATION` route |

### Settings Page UI

```
Settings → Translation
┌─────────────────────────────────────────────────────┐
│  OpenAI Configuration                               │
│  ───────────────────                                │
│  API Key     [••••••••••••sk-xxxx]  [Test] [Clear]  │
│  Model       [gpt-4o-mini           ▼]              │
│                                                     │
│  Default Locales                                    │
│  ───────────────                                    │
│  Default Locale    [English (en_US)        ▼]       │
│  Target Locales    [es_ES] [fr_FR] [de_DE] [+Add]   │
│                                                     │
│                    [Save Settings]                  │
└─────────────────────────────────────────────────────┘
```

---

## API Integration Points

### Files to Modify

Replace `@novu/ee-translation` imports with `@novu/translation`:

**app.module.ts:**
```typescript
// BEFORE
if (require('@novu/ee-translation')?.EnterpriseTranslationModule)
  modules.push(require('@novu/ee-translation')...)

// AFTER
import { TranslationModule } from '@novu/translation';
modules.push(TranslationModule);
```

**Usecase Files (10 files):**

| Usecase | Files |
|---------|-------|
| ManageTranslations | `patch-workflow.usecase.ts`, `update-workflow.usecase.ts`, `create-workflow.usecase.ts`, `upsert-layout.usecase.ts` |
| DeleteTranslationGroup | `delete-workflow.usecase.ts`, `delete-layout.use-case.ts` |
| PublishTranslationGroup | `sync-to-environment.usecase.ts`, `layout-sync-to-environment.usecase.ts` |
| DuplicateLocales | `duplicate-workflow.usecase.ts`, `duplicate-layout.use-case.ts` |

**Pattern:**
```typescript
// BEFORE
const isEnterprise = process.env.NOVU_ENTERPRISE === 'true';
if (!isEnterprise || isSelfHosted) return;
const manageTranslations = this.moduleRef.get(require('@novu/ee-translation')?.ManageTranslations);

// AFTER
import { ManageTranslations } from '@novu/translation';
constructor(private manageTranslations: ManageTranslations) {}
await this.manageTranslations.execute(command);
```

---

## Implementation Phases

### Phase 1: Package Foundation
- [ ] Create `packages/translation` directory structure
- [ ] Setup `package.json`, `tsconfig.json`
- [ ] Create `TranslationModule` (NestJS)
- [ ] Create `TranslationSettingsEntity` + Repository
- [ ] Wire into `apps/api/src/app.module.ts`

### Phase 2: Core Services
- [ ] `VariableTokenizerService` (tokenize/detokenize)
- [ ] `TranslationValidatorService` (HTML/token validation)
- [ ] `OpenAITranslationService` (API integration)
- [ ] Unit tests for all services

### Phase 3: Usecases (EE Replacement)
- [ ] `ManageTranslations` usecase
- [ ] `DeleteTranslationGroup` usecase
- [ ] `PublishTranslationGroup` usecase
- [ ] `DuplicateLocales` usecase
- [ ] `AutoTranslate` usecase (new - OpenAI integration)

### Phase 4: API Controller
- [ ] `TranslationController` with all endpoints
- [ ] `TranslationSettingsController` (OpenAI config CRUD)
- [ ] E2E tests

### Phase 5: API Integration
- [ ] Replace `@novu/ee-translation` imports in all 10 usecase files
- [ ] Remove enterprise guards (`isEnterprise`, `isSelfHosted` checks)
- [ ] Integration tests

### Phase 6: Dashboard
- [ ] Translation Settings page (OpenAI config)
- [ ] Update `useIsTranslationEnabled` hook
- [ ] Add navigation menu item
- [ ] Add route
- [ ] E2E tests

### Phase 7: Background Jobs
- [ ] Translation job queue (Bull)
- [ ] Worker job processor
- [ ] Progress tracking (WebSocket updates)

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package location | `packages/translation` | Isolated, maintainable, minimal merge conflicts |
| API key storage | Organization-level, encrypted | Each org manages own key |
| DB schema | Isolated `TranslationSettingsEntity` | Zero changes to `libs/dal` |
| Translation trigger | Hybrid (auto first, on-demand after) | Balance automation and control |
| Variable handling | Token replacement | Deterministic, guaranteed preservation |
| HTML handling | Direct to OpenAI + validation | Simplest, avoids parser errors |
| EE replacement | Direct import replacement | Clean, no conditional loading |
| Dashboard location | Settings → Translation | Dedicated visibility |

---

## Future Considerations

- Support for additional AI providers (Anthropic, Google, etc.)
- Translation memory/cache to reduce API costs
- Glossary/terminology management
- Platform localization via next-i18n
- Translation review workflow
