# Design: AI-Powered Translation Feature

## Context

Novu provides translation functionality for notification content through an enterprise-only package (`@novu/ee-translation`). ReNovu needs to:
1. Unlock this for self-hosted deployments
2. Add AI-powered automatic translation to reduce manual effort
3. Minimize changes to Novu core to facilitate upstream merges

**Stakeholders:**
- ReNovu self-hosted users who need multilingual notifications
- Organizations managing translations across multiple locales

## Goals / Non-Goals

### Goals
- Full parity with `@novu/ee-translation` functionality
- AI-powered translation via OpenAI API
- Organization-level API key management
- Zero modifications to `libs/dal` (Novu core data layer)
- Easy upstream merge compatibility

### Non-Goals
- Platform/dashboard localization (future: next-i18n)
- Support for translation providers other than OpenAI
- Real-time collaborative translation editing
- Translation memory or glossary management

## Decisions

### 1. Package Location: `packages/translation`

**Decision:** Create new isolated package instead of modifying existing code.

**Rationale:**
- Novu's enterprise code is not available for reference
- Isolated package minimizes merge conflicts with upstream
- Clear separation of ReNovu extensions from Novu core
- Package can be easily disabled/swapped if upstream adds open-source translation

**Alternatives considered:**
- Modify `libs/application-generic` - Rejected: high merge conflict risk
- Add to `apps/api/src/ee/` - Rejected: still touches core app structure

### 2. Database Schema: Isolated `TranslationSettingsEntity`

**Decision:** Create separate MongoDB collection (`translation_settings`) owned by the translation package.

**Rationale:**
- Zero modifications to `libs/dal`
- Self-contained data model
- Easy to add/remove feature without affecting core schemas

**Schema:**
```typescript
interface TranslationSettingsEntity {
  _id: ObjectId;
  _organizationId: string;  // Indexed, unique
  openaiApiKey: string;     // AES-256 encrypted
  openaiModel: string;      // "gpt-4o-mini" | "gpt-4o" | "gpt-4-turbo"
  defaultLocale: string;    // "en_US"
  targetLocales: string[];  // ["es_ES", "fr_FR", "de_DE"]
  createdAt: Date;
  updatedAt: Date;
}
```

**Alternatives considered:**
- Extend `OrganizationEntity` - Rejected: modifies core schema
- Generic `OrganizationSettingsEntity` - Rejected: less isolated, schema grows

### 3. Variable Handling: Token Replacement

**Decision:** Replace `{{variables}}` with `[VAR_X]` tokens before translation, restore after.

**Rationale:**
- Deterministic: guarantees variable preservation
- LLM-agnostic: works regardless of AI model behavior
- Validatable: can verify all tokens restored

**Flow:**
```
Input:  "Hi {{user.name}}, your order {{orderId}} is ready!"
     ↓ tokenize()
Tokens: "Hi [VAR_1], your order [VAR_2] is ready!"
     ↓ OpenAI translate
Output: "¡Hola [VAR_1], tu pedido [VAR_2] está listo!"
     ↓ detokenize()
Final:  "¡Hola {{user.name}}, tu pedido {{orderId}} está listo!"
```

**Alternatives considered:**
- Instruct LLM to preserve variables - Rejected: not deterministic
- Use placeholder text (e.g., "[NAME]") - Rejected: may conflict with content
- Extract and skip translation - Rejected: loses context for AI

### 4. HTML Handling: Direct Translation with Validation

**Decision:** Send full HTML to OpenAI, validate output preserves structure.

**Rationale:**
- Simplest implementation
- Modern LLMs (GPT-4o) handle HTML well
- Parsing HTML introduces more failure modes
- Validation layer catches issues

**Validation checks:**
1. All `[VAR_X]` tokens restored
2. HTML tag count matches (within tolerance)
3. No broken tags (`<tag` without `>`)
4. Content length sanity check

**Alternatives considered:**
- Extract text nodes, translate, reassemble - Rejected: parser complexity
- Convert to Markdown, translate, convert back - Rejected: fidelity loss

### 5. Translation Trigger: Hybrid Approach

**Decision:** Auto-translate on first enable, on-demand for updates.

**Rationale:**
- Immediate value when user enables translation
- Avoids wasteful re-translation on every content edit
- User controls when to sync updates

**Flow:**
1. User enables translation → Auto-translate all target locales
2. Content updated → Mark locales as "outdated"
3. User clicks "Update translations" → Re-translate outdated locales

**Alternatives considered:**
- Always manual - Rejected: poor initial experience
- Always automatic - Rejected: wasteful API calls on frequent edits

### 6. EE Module Replacement: Direct Import

**Decision:** Replace all `@novu/ee-translation` dynamic imports with direct `@novu/translation` imports.

**Rationale:**
- Clean, no conditional loading complexity
- ReNovu is always self-hosted, no need for conditional paths
- Easier to maintain and debug

**Pattern:**
```typescript
// BEFORE (Novu)
const isEnterprise = process.env.NOVU_ENTERPRISE === 'true';
if (!isEnterprise || isSelfHosted) return;
const manageTranslations = this.moduleRef.get(require('@novu/ee-translation')?.ManageTranslations);

// AFTER (ReNovu)
import { ManageTranslations } from '@novu/translation';
constructor(private manageTranslations: ManageTranslations) {}
await this.manageTranslations.execute(command);
```

### 7. OpenAI Model Selection

**Decision:** Support multiple models, default to `gpt-4o-mini`.

**Options:**
- `gpt-4o-mini` - Faster, cheaper, good quality (default)
- `gpt-4o` - Higher quality for complex content
- `gpt-4-turbo` - Balance of speed and quality

**Rationale:**
- Organizations can choose cost/quality tradeoff
- Default to cost-effective option for most use cases

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| OpenAI API unavailability | Retry with exponential backoff, fallback to manual |
| Translation quality issues | Validation layer + manual editing always available |
| Rate limits on batch translation | Queue-based processing with rate limiting |
| API key exposure | AES-256 encryption, masked in UI |
| Merge conflicts with upstream | Isolated package, minimal core changes |

## Migration Plan

### From Fresh Install
1. Deploy updated API with translation package
2. Deploy updated dashboard
3. Users configure OpenAI key in Settings → Translation
4. Users enable translation on workflows/layouts

### From Existing ReNovu
1. No data migration needed (new collection)
2. Existing LocalizationGroup/Localization tables reused
3. Users just need to configure OpenAI settings

### Rollback
1. Revert API deployment
2. Revert dashboard deployment
3. TranslationSettings collection can be dropped (no dependencies)

## Open Questions

1. **Rate Limiting:** Should we implement organization-level rate limits to prevent runaway API costs?
   - *Proposed:* Start without, add if needed based on usage patterns

2. **Translation Cache:** Should we cache translations to reduce repeat API calls?
   - *Proposed:* Not in v1, consider for future optimization

3. **Glossary Support:** Should organizations be able to define translation glossaries?
   - *Proposed:* Not in v1, add based on user feedback
