import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import { TranslationSettingsRepository, OpenAIModelEnum } from '../dal';
import { VariableTokenizerService } from './variable-tokenizer.service';
import { TranslationValidatorService } from './translation-validator.service';
import {
  TranslateRequest,
  TranslateResponse,
  BatchTranslateRequest,
  BatchTranslateResponse,
  ConnectionTestResult,
  ApiKeyNotConfiguredError,
  RateLimitError,
  InvalidResponseError,
} from '../types/translation.types';

/**
 * Default configuration for translation
 */
const DEFAULT_CONFIG = {
  /** Default model if not configured */
  MODEL: OpenAIModelEnum.GPT_4O_MINI,
  /** Maximum retries for failed API calls */
  MAX_RETRIES: 3,
  /** Base delay for exponential backoff (ms) */
  BASE_DELAY_MS: 1000,
  /** Maximum delay between retries (ms) */
  MAX_DELAY_MS: 10000,
  /** Temperature for translation (0 = deterministic) */
  TEMPERATURE: 0.3,
  /** Maximum tokens for response */
  MAX_TOKENS: 4096,
};

/**
 * Locale display names for better prompt context
 */
const LOCALE_NAMES: Record<string, string> = {
  en_US: 'English (US)',
  en_GB: 'English (UK)',
  es_ES: 'Spanish (Spain)',
  es_MX: 'Spanish (Mexico)',
  fr_FR: 'French (France)',
  fr_CA: 'French (Canada)',
  de_DE: 'German',
  it_IT: 'Italian',
  pt_BR: 'Portuguese (Brazil)',
  pt_PT: 'Portuguese (Portugal)',
  ja_JP: 'Japanese',
  ko_KR: 'Korean',
  zh_CN: 'Chinese (Simplified)',
  zh_TW: 'Chinese (Traditional)',
  ar_SA: 'Arabic',
  hi_IN: 'Hindi',
  ru_RU: 'Russian',
  nl_NL: 'Dutch',
  pl_PL: 'Polish',
  tr_TR: 'Turkish',
  th_TH: 'Thai',
  vi_VN: 'Vietnamese',
  id_ID: 'Indonesian',
  ms_MY: 'Malay',
  sv_SE: 'Swedish',
  da_DK: 'Danish',
  fi_FI: 'Finnish',
  no_NO: 'Norwegian',
  cs_CZ: 'Czech',
  el_GR: 'Greek',
  he_IL: 'Hebrew',
  hu_HU: 'Hungarian',
  ro_RO: 'Romanian',
  sk_SK: 'Slovak',
  uk_UA: 'Ukrainian',
};

/**
 * OpenAITranslationService
 *
 * Provides AI-powered translation using OpenAI's GPT models.
 * Handles variable tokenization, translation, detokenization, and validation
 * in a single workflow.
 *
 * Features:
 * - Automatic variable protection using token replacement
 * - HTML preservation with validation
 * - Exponential backoff retry logic
 * - Batch translation support
 * - Connection testing
 *
 * @example
 * ```typescript
 * const translationService = new OpenAITranslationService(
 *   settingsRepository,
 *   tokenizer,
 *   validator
 * );
 *
 * const result = await translationService.translate({
 *   organizationId: 'org_123',
 *   content: '<p>Hello {{name}}!</p>',
 *   sourceLocale: 'en_US',
 *   targetLocale: 'es_ES',
 * });
 *
 * // result.translated: '<p>Hola {{name}}!</p>'
 * ```
 */
@Injectable()
export class OpenAITranslationService {
  private readonly logger = new Logger(OpenAITranslationService.name);

  constructor(
    private readonly settingsRepository: TranslationSettingsRepository,
    private readonly tokenizer: VariableTokenizerService,
    private readonly validator: TranslationValidatorService
  ) {}

  /**
   * Translate content from source locale to target locale
   *
   * The translation workflow:
   * 1. Load organization settings (API key, model)
   * 2. Tokenize variables to protect them from translation
   * 3. Send tokenized content to OpenAI
   * 4. Detokenize the translated content
   * 5. Validate the result
   *
   * @param request - Translation request
   * @returns Translation response with result or error
   */
  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const startTime = Date.now();
    const {
      organizationId,
      content,
      sourceLocale,
      targetLocale,
      contentType,
      skipValidation = false,
      customInstructions,
    } = request;

    try {
      // 1. Get organization settings
      const settings = await this.settingsRepository.findByOrganization(organizationId);

      if (!settings?.openaiApiKey) {
        throw new ApiKeyNotConfiguredError(organizationId);
      }

      // 2. Tokenize variables
      const { tokenized, variableMap, variables } = this.tokenizer.tokenize(content);

      this.logger.debug(`Tokenized ${variables.length} variables for translation`);

      // 3. Build prompt and call OpenAI
      const prompt = this.buildPrompt(tokenized, sourceLocale, targetLocale, contentType, customInstructions);
      const model = settings.openaiModel || DEFAULT_CONFIG.MODEL;

      const openai = new OpenAI({
        apiKey: settings.openaiApiKey,
      });

      const completion = await this.withRetry(() =>
        openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: DEFAULT_CONFIG.TEMPERATURE,
          max_tokens: DEFAULT_CONFIG.MAX_TOKENS,
        })
      );

      const rawTranslation = completion.choices[0]?.message?.content;

      if (!rawTranslation) {
        throw new InvalidResponseError('Empty response from OpenAI');
      }

      // 4. Detokenize the translated content
      const translated = this.tokenizer.detokenize(rawTranslation.trim(), variableMap);

      // 5. Validate the result
      let validation = undefined;
      if (!skipValidation) {
        validation = this.validator.validate({
          original: content,
          translated,
          variableMap,
        });

        if (!validation.valid) {
          this.logger.warn(`Translation validation failed: ${this.validator.getSummary(validation)}`);
        }
      }

      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        translated,
        validation,
        metadata: {
          model,
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
          latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`Translation failed after ${latencyMs}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          model: 'unknown',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          latencyMs,
        },
      };
    }
  }

  /**
   * Translate multiple content items in batch
   *
   * Processes each item individually to provide granular error handling.
   * Failed items won't affect other items in the batch.
   *
   * @param request - Batch translation request
   * @returns Batch translation response with results for each item
   */
  async translateBatch(request: BatchTranslateRequest): Promise<BatchTranslateResponse> {
    const startTime = Date.now();
    const { organizationId, items, sourceLocale, targetLocale, skipValidation } = request;

    const results: BatchTranslateResponse['results'] = [];
    let successfulItems = 0;
    let failedItems = 0;
    let totalTokens = 0;

    for (const item of items) {
      const response = await this.translate({
        organizationId,
        content: item.content,
        sourceLocale,
        targetLocale,
        contentType: item.contentType,
        skipValidation,
      });

      if (response.success) {
        successfulItems++;
        totalTokens += response.metadata?.totalTokens || 0;
        results.push({
          id: item.id,
          success: true,
          translated: response.translated,
          validation: response.validation,
        });
      } else {
        failedItems++;
        results.push({
          id: item.id,
          success: false,
          error: response.error,
        });
      }
    }

    const totalLatencyMs = Date.now() - startTime;

    return {
      success: failedItems === 0,
      results,
      metadata: {
        totalItems: items.length,
        successfulItems,
        failedItems,
        totalTokens,
        totalLatencyMs,
      },
    };
  }

  /**
   * Test the OpenAI API connection for an organization
   *
   * Makes a simple API call to verify the API key is valid and working.
   *
   * @param organizationId - Organization to test connection for
   * @returns Connection test result
   */
  async testConnection(organizationId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const settings = await this.settingsRepository.findByOrganization(organizationId);

      if (!settings?.openaiApiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured',
        };
      }

      const openai = new OpenAI({
        apiKey: settings.openaiApiKey,
      });

      const model = settings.openaiModel || DEFAULT_CONFIG.MODEL;

      // Simple test call
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: 'Respond with "OK" to confirm the connection works.',
          },
        ],
        max_tokens: 10,
      });

      const response = completion.choices[0]?.message?.content;
      const latencyMs = Date.now() - startTime;

      if (response) {
        return {
          success: true,
          model,
          latencyMs,
        };
      }

      return {
        success: false,
        error: 'Empty response from API',
        model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Parse specific OpenAI errors
      if (errorMessage.includes('401') || errorMessage.includes('invalid_api_key')) {
        return {
          success: false,
          error: 'Invalid API key',
          latencyMs,
        };
      }

      if (errorMessage.includes('429')) {
        return {
          success: false,
          error: 'Rate limit exceeded - please try again later',
          latencyMs,
        };
      }

      return {
        success: false,
        error: errorMessage,
        latencyMs,
      };
    }
  }

  /**
   * Execute a function with exponential backoff retry logic
   *
   * Retries on transient errors (rate limits, server errors) but not on
   * permanent errors (invalid key, bad request).
   *
   * @param fn - Function to execute
   * @param maxRetries - Maximum number of retry attempts
   * @returns Result of the function
   */
  private async withRetry<T>(fn: () => Promise<T>, maxRetries: number = DEFAULT_CONFIG.MAX_RETRIES): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = DEFAULT_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, DEFAULT_CONFIG.MAX_DELAY_MS);

        this.logger.warn(
          `Translation attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms: ${lastError.message}`
        );

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Retry failed with unknown error');
  }

  /**
   * Check if an error is retryable
   *
   * @param error - Error to check
   * @returns True if the error is transient and can be retried
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retryable errors
    if (message.includes('429') || message.includes('rate limit')) {
      return true;
    }
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }
    if (message.includes('timeout') || message.includes('econnreset') || message.includes('network')) {
      return true;
    }

    // Non-retryable errors
    if (message.includes('401') || message.includes('invalid_api_key') || message.includes('unauthorized')) {
      return false;
    }
    if (message.includes('400') || message.includes('bad request')) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Sleep for a specified duration
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the system prompt for translation
   *
   * @returns System prompt string
   */
  private getSystemPrompt(): string {
    return `You are a professional translator specializing in notification and email content. Your translations are accurate, natural-sounding, and preserve all technical elements exactly as they appear in the source.

Key requirements:
1. Preserve ALL HTML tags and attributes exactly as they appear
2. Preserve [VAR_X] tokens exactly as they appear (these are placeholders for variables)
3. Only translate visible text content
4. Maintain the same structure, formatting, and whitespace
5. Do not add or remove any HTML elements
6. Do not translate code, URLs, or technical identifiers
7. Provide natural, culturally appropriate translations
8. Maintain the tone and formality level of the original content`;
  }

  /**
   * Build the translation prompt
   *
   * @param content - Tokenized content to translate
   * @param sourceLocale - Source locale
   * @param targetLocale - Target locale
   * @param contentType - Optional content type hint
   * @param customInstructions - Optional custom instructions
   * @returns Complete prompt string
   */
  private buildPrompt(
    content: string,
    sourceLocale: string,
    targetLocale: string,
    contentType?: string,
    customInstructions?: string
  ): string {
    const sourceName = LOCALE_NAMES[sourceLocale] || sourceLocale;
    const targetName = LOCALE_NAMES[targetLocale] || targetLocale;

    let prompt = `Translate the following content from ${sourceName} to ${targetName}.

Rules:
- Preserve ALL HTML tags and attributes exactly as-is
- Preserve [VAR_X] tokens exactly as-is (do not translate these)
- Only translate visible text content
- Maintain the same structure and formatting
- Do not add or remove any HTML elements`;

    if (contentType) {
      prompt += `\n- This is ${contentType} notification content`;
    }

    if (customInstructions) {
      // Sanitize custom instructions to prevent prompt injection
      // - Limit length to 500 characters
      // - Replace newlines with spaces to prevent structure manipulation
      // - Trim whitespace
      const sanitizedInstructions = customInstructions
        .slice(0, 500)
        .replace(/[\r\n]+/g, ' ')
        .trim();
      if (sanitizedInstructions.length > 0) {
        prompt += `\n- Additional instructions: ${sanitizedInstructions}`;
      }
    }

    prompt += `

Content:
${content}

Translated content:`;

    return prompt;
  }

  /**
   * Get locale display name
   *
   * @param locale - BCP-47 locale code
   * @returns Human-readable locale name
   */
  getLocaleName(locale: string): string {
    return LOCALE_NAMES[locale] || locale;
  }

  /**
   * Get all supported locales
   *
   * @returns Map of locale codes to display names
   */
  getSupportedLocales(): Record<string, string> {
    return { ...LOCALE_NAMES };
  }
}
