import { Injectable, Logger } from '@nestjs/common';
import {
  LocalizationGroupRepository,
  LocalizationRepository,
  LocalizationGroupEntity,
  LocalizationResourceEnum as DalLocalizationResourceEnum,
} from '@novu/dal';

import { TranslationSettingsRepository } from '../../dal';
import { OpenAITranslationService } from '../../services';
import {
  AutoTranslateCommand,
  AutoTranslateResult,
  LocaleTranslateResult,
  LocalizationResourceEnum,
} from './auto-translate.command';

/**
 * AutoTranslate Usecase
 *
 * Automatically translates content using OpenAI and stores the results.
 *
 * The translation process:
 * 1. Get organization translation settings (API key, model, locales)
 * 2. Get or create LocalizationGroup for the resource
 * 3. For each target locale:
 *    a. Call OpenAI translation service for each content key
 *    b. Validate translated content
 *    c. Store in Localization documents
 * 4. Handle partial failures gracefully
 *
 * @example
 * ```typescript
 * // Auto-translate workflow content
 * const result = await autoTranslate.execute(
 *   AutoTranslateCommand.create({
 *     resourceId: 'welcome-email-workflow',
 *     resourceInternalId: '60d5ec9f1c9d440000a1b2c3',
 *     resourceType: LocalizationResourceEnum.WORKFLOW,
 *     organizationId: 'org_123',
 *     environmentId: 'env_456',
 *     userId: 'user_789',
 *     sourceContent: {
 *       'step.email.subject': 'Welcome to {{company}}!',
 *       'step.email.body': '<p>Hello {{name}},</p>',
 *     },
 *   })
 * );
 *
 * console.log(`Translated to ${result.metadata.successfulLocales} locales`);
 * ```
 */
@Injectable()
export class AutoTranslate {
  private readonly logger = new Logger(AutoTranslate.name);

  constructor(
    private readonly localizationGroupRepository: LocalizationGroupRepository,
    private readonly localizationRepository: LocalizationRepository,
    private readonly settingsRepository: TranslationSettingsRepository,
    private readonly openAITranslationService: OpenAITranslationService
  ) {}

  /**
   * Execute the auto-translate command
   *
   * @param command - The command containing content and configuration
   * @returns Result with translated content for each locale
   */
  async execute(command: AutoTranslateCommand): Promise<AutoTranslateResult> {
    const startTime = Date.now();
    const {
      resourceId,
      resourceInternalId,
      resourceType,
      organizationId,
      environmentId,
      sourceContent,
      targetLocales: overrideTargetLocales,
      sourceLocale: overrideSourceLocale,
      contentType,
      customInstructions,
      skipValidation,
      session,
    } = command;

    // Step 1: Get organization settings
    const settings = await this.settingsRepository.findByOrganization(organizationId);

    if (!settings) {
      return this.createErrorResult(
        'Translation settings not configured for organization',
        overrideSourceLocale || 'en_US',
        startTime
      );
    }

    if (!settings.openaiApiKey) {
      return this.createErrorResult(
        'OpenAI API key not configured',
        overrideSourceLocale || settings.defaultLocale || 'en_US',
        startTime
      );
    }

    const sourceLocale = overrideSourceLocale || settings.defaultLocale || 'en_US';
    const targetLocales = overrideTargetLocales || settings.targetLocales || [];

    if (targetLocales.length === 0) {
      return this.createErrorResult(
        'No target locales configured',
        sourceLocale,
        startTime
      );
    }

    // Validate content
    const contentKeys = Object.keys(sourceContent);
    if (contentKeys.length === 0) {
      return this.createErrorResult(
        'No content to translate',
        sourceLocale,
        startTime
      );
    }

    // Convert to DAL enum
    const dalResourceType = this.convertToDalResourceType(resourceType);

    // Step 2: Get or create LocalizationGroup
    let localizationGroup: LocalizationGroupEntity | undefined;

    if (resourceInternalId) {
      localizationGroup = await this.localizationGroupRepository.getOrCreateForResource(
        dalResourceType,
        resourceId,
        resourceId, // Use resourceId as name if not provided
        resourceInternalId,
        environmentId,
        organizationId,
        session
      ) || undefined;
    }

    // Step 3: Translate for each target locale
    const results: LocaleTranslateResult[] = [];
    let totalTokensUsed = 0;

    for (const targetLocale of targetLocales) {
      // Skip if target is same as source
      if (targetLocale === sourceLocale) {
        results.push({
          locale: targetLocale,
          success: true,
          content: sourceContent, // Same as source
          warnings: ['Skipped: target locale same as source'],
        });
        continue;
      }

      const localeResult = await this.translateForLocale(
        organizationId,
        sourceContent,
        sourceLocale,
        targetLocale,
        contentType,
        customInstructions,
        skipValidation
      );

      results.push(localeResult);

      // Track token usage if available
      if (localeResult.success && localeResult.content) {
        // Estimate token usage (actual tracking would come from the service)
        totalTokensUsed += Object.keys(localeResult.content).length * 100; // Rough estimate
      }

      // Store successful translations
      if (localeResult.success && localeResult.content && localizationGroup) {
        await this.storeTranslations(
          localizationGroup._id,
          targetLocale,
          localeResult.content,
          environmentId,
          organizationId,
          session
        );
      }
    }

    // Calculate summary statistics
    const successfulLocales = results.filter((r) => r.success).length;
    const failedLocales = results.filter((r) => !r.success).length;
    const totalLatencyMs = Date.now() - startTime;

    this.logger.log(
      `Auto-translate completed: ${successfulLocales}/${targetLocales.length} locales successful in ${totalLatencyMs}ms`
    );

    return {
      success: failedLocales === 0,
      sourceLocale,
      results,
      metadata: {
        totalLocales: targetLocales.length,
        successfulLocales,
        failedLocales,
        totalTokensUsed,
        totalLatencyMs,
      },
      localizationGroupId: localizationGroup?._id,
    };
  }

  /**
   * Translate content for a single locale
   */
  private async translateForLocale(
    organizationId: string,
    sourceContent: Record<string, string>,
    sourceLocale: string,
    targetLocale: string,
    contentType?: string,
    customInstructions?: string,
    skipValidation?: boolean
  ): Promise<LocaleTranslateResult> {
    const translatedContent: Record<string, string> = {};
    const warnings: string[] = [];
    let hasError = false;
    let errorMessage: string | undefined;

    for (const [key, content] of Object.entries(sourceContent)) {
      try {
        const result = await this.openAITranslationService.translate({
          organizationId,
          content,
          sourceLocale,
          targetLocale,
          contentType: contentType as any,
          customInstructions,
          skipValidation,
        });

        if (result.success && result.translated) {
          translatedContent[key] = result.translated;

          // Check for validation warnings
          if (result.validation && !result.validation.valid) {
            const validationWarnings = result.validation.errors
              .map((e) => `${key}: ${e.message}`)
              .filter(Boolean);
            warnings.push(...validationWarnings);
          }
        } else {
          // Translation failed for this content item
          warnings.push(`${key}: ${result.error || 'Translation failed'}`);
          // Use original content as fallback
          translatedContent[key] = content;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Translation failed for key ${key}: ${errorMsg}`);
        hasError = true;
        errorMessage = errorMsg;
        // Use original content as fallback
        translatedContent[key] = content;
        warnings.push(`${key}: ${errorMsg}`);
      }
    }

    return {
      locale: targetLocale,
      success: !hasError,
      content: translatedContent,
      error: errorMessage,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Store translated content in the database
   */
  private async storeTranslations(
    groupId: string,
    locale: string,
    content: Record<string, string>,
    environmentId: string,
    organizationId: string,
    session?: any
  ): Promise<void> {
    // Serialize content to JSON string for storage
    const serializedContent = JSON.stringify(content);

    // Check if localization exists for this locale
    const existingLocalization = await this.localizationRepository.findOne({
      _localizationGroupId: groupId,
      locale,
      _environmentId: environmentId,
      _organizationId: organizationId,
    });

    if (existingLocalization) {
      // Update existing localization
      await this.localizationRepository.update(
        {
          _id: existingLocalization._id,
          _environmentId: environmentId,
          _organizationId: organizationId,
        },
        {
          $set: {
            content: serializedContent,
            updatedAt: new Date().toISOString(),
          },
        },
        { session }
      );

      this.logger.debug(
        `Updated localization ${existingLocalization._id} for locale ${locale}`
      );
    } else {
      // Create new localization
      await this.localizationRepository.create(
        {
          _localizationGroupId: groupId,
          locale,
          content: serializedContent,
          _environmentId: environmentId,
          _organizationId: organizationId,
        },
        { session }
      );

      this.logger.debug(
        `Created new localization for locale ${locale} in group ${groupId}`
      );
    }
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    error: string,
    sourceLocale: string,
    startTime: number
  ): AutoTranslateResult {
    return {
      success: false,
      sourceLocale,
      results: [
        {
          locale: 'all',
          success: false,
          error,
        },
      ],
      metadata: {
        totalLocales: 0,
        successfulLocales: 0,
        failedLocales: 1,
        totalTokensUsed: 0,
        totalLatencyMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Convert local enum to DAL enum
   */
  private convertToDalResourceType(resourceType: LocalizationResourceEnum): DalLocalizationResourceEnum {
    switch (resourceType) {
      case LocalizationResourceEnum.WORKFLOW:
        return DalLocalizationResourceEnum.WORKFLOW;
      case LocalizationResourceEnum.LAYOUT:
        return DalLocalizationResourceEnum.LAYOUT;
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }
}
