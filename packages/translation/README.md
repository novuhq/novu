# @novu/translation

AI-powered translation services for Novu notification content.

## Overview

This package provides translation capabilities for ReNovu (self-hosted Novu), enabling automatic translation of notification content via OpenAI's GPT models. It replaces the enterprise-only `@novu/ee-translation` module with an open-source implementation.

## Features

- **AI-Powered Translation**: Automatic translation using OpenAI GPT models (gpt-4o-mini, gpt-4o, gpt-4-turbo)
- **Variable Protection**: Tokenizes `{{variables}}` to prevent translation corruption
- **HTML Validation**: Validates translated content preserves HTML structure
- **Organization-Level API Keys**: Each organization configures their own OpenAI API key
- **Encrypted Storage**: API keys are AES-256 encrypted at rest
- **Batch Translation**: Translate multiple content items in a single request
- **Async Processing**: Background job queue for high-volume translation (optional)

## Architecture

```
packages/translation/
├── src/
│   ├── controllers/           # API endpoints
│   │   ├── translation-settings.controller.ts
│   │   └── translation.controller.ts
│   ├── dal/                   # Data Access Layer
│   │   ├── translation-settings.entity.ts
│   │   ├── translation-settings.schema.ts
│   │   └── translation-settings.repository.ts
│   ├── dtos/                  # Request/Response DTOs
│   ├── services/              # Core services
│   │   ├── openai-translation.service.ts
│   │   ├── variable-tokenizer.service.ts
│   │   └── translation-validator.service.ts
│   ├── usecases/              # CQRS usecases
│   │   ├── auto-translate/
│   │   ├── manage-translations/
│   │   ├── delete-translation-group/
│   │   ├── publish-translation-group/
│   │   ├── duplicate-locales/
│   │   └── enqueue-translation/
│   ├── types/                 # TypeScript types
│   └── translation.module.ts  # NestJS module
```

## Installation

This package is included in the ReNovu monorepo. No separate installation needed.

## Configuration

### Environment Variables

No environment variables required - configuration is per-organization via the dashboard.

### API Key Setup

1. Navigate to **Settings → Translations** in the dashboard
2. Enter your OpenAI API key
3. Select the model (gpt-4o-mini recommended for cost-effectiveness)
4. Configure default and target locales
5. Click "Test Connection" to verify
6. Save settings

## Usage

### API Endpoints

#### Translation Settings

```http
# Get translation settings
GET /v1/translation-settings

# Update translation settings
PUT /v1/translation-settings
Content-Type: application/json
{
  "openaiApiKey": "sk-...",
  "openaiModel": "gpt-4o-mini",
  "defaultLocale": "en_US",
  "targetLocales": ["es_ES", "fr_FR", "de_DE"]
}

# Test OpenAI connection
POST /v1/translation-settings/test

# Delete translation settings
DELETE /v1/translation-settings
```

#### Auto-Translation

```http
# Trigger auto-translation (synchronous)
POST /v1/translations/auto-translate
Content-Type: application/json
{
  "resourceId": "workflow-123",
  "resourceType": "WORKFLOW",
  "targetLocales": ["es_ES", "fr_FR"]
}

# Trigger auto-translation (async - background job)
POST /v1/translations/auto-translate?async=true
Content-Type: application/json
{
  "resourceId": "workflow-123",
  "resourceType": "WORKFLOW",
  "targetLocales": ["es_ES", "fr_FR"]
}

# Check translation job status
GET /v1/translations/status/:jobId
```

### Module Integration

```typescript
// In your NestJS module
import { TranslationModule } from '@novu/translation';

@Module({
  imports: [
    TranslationModule.forRoot({
      includeControllers: true,
      includeQueueService: true, // Enable async translation queue
    }),
  ],
})
export class AppModule {}
```

### Using Services Directly

```typescript
import { OpenAITranslationService } from '@novu/translation';

@Injectable()
export class MyService {
  constructor(private translationService: OpenAITranslationService) {}

  async translateContent() {
    const result = await this.translationService.translate({
      organizationId: 'org_123',
      content: '<p>Hello {{name}}!</p>',
      sourceLocale: 'en_US',
      targetLocale: 'es_ES',
    });

    if (result.success) {
      console.log(result.translated); // '<p>Hola {{name}}!</p>'
    }
  }
}
```

## Supported Locales

The service supports 35+ locales including:

| Code | Language |
|------|----------|
| en_US | English (US) |
| en_GB | English (UK) |
| es_ES | Spanish (Spain) |
| es_MX | Spanish (Mexico) |
| fr_FR | French (France) |
| fr_CA | French (Canada) |
| de_DE | German |
| it_IT | Italian |
| pt_BR | Portuguese (Brazil) |
| pt_PT | Portuguese (Portugal) |
| ja_JP | Japanese |
| ko_KR | Korean |
| zh_CN | Chinese (Simplified) |
| zh_TW | Chinese (Traditional) |
| ar_SA | Arabic |
| ... | (and more) |

## Variable Tokenization

The service automatically protects template variables during translation:

**Input:**
```html
<p>Hello {{user.name}}, your order {{order.id}} is ready!</p>
```

**Tokenized (sent to OpenAI):**
```html
<p>Hello [VAR_1], your order [VAR_2] is ready!</p>
```

**Translated (Spanish):**
```html
<p>Hola [VAR_1], tu pedido [VAR_2] está listo!</p>
```

**Output (detokenized):**
```html
<p>Hola {{user.name}}, tu pedido {{order.id}} está listo!</p>
```

## Validation

Translated content is validated for:

1. **Token Integrity**: All `[VAR_X]` tokens restored correctly
2. **HTML Balance**: Opening/closing tags match
3. **Tag Preservation**: No HTML tags removed or added
4. **Content Length**: Reasonable translation length ratio

## Error Handling

The service uses exponential backoff for transient errors:

| Error Type | Retryable | Strategy |
|------------|-----------|----------|
| Rate Limit (429) | Yes | Exponential backoff |
| Server Error (5xx) | Yes | Exponential backoff |
| Network Timeout | Yes | Exponential backoff |
| Invalid API Key (401) | No | Fail immediately |
| Bad Request (400) | No | Fail immediately |

## Security

- **API Key Encryption**: OpenAI API keys are encrypted with AES-256 before storage
- **Key Masking**: API responses never expose the full key, only `sk-...xxxx`
- **Per-Organization Isolation**: Each organization manages their own API key

## Testing

```bash
cd packages/translation
pnpm test
```

## Dependencies

- `openai` - OpenAI API client
- `@nestjs/common` - NestJS framework
- `mongoose` - MongoDB ODM
- `class-validator` - DTO validation
- `class-transformer` - Object transformation

## License

MIT
