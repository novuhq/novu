import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ClientSession } from 'mongoose';

/**
 * Resource types that support translation management
 */
export enum LocalizationResourceEnum {
  WORKFLOW = 'workflow',
  LAYOUT = 'layout',
}

/**
 * Content type hints for better translation quality
 */
export type TranslationContentType = 'email' | 'sms' | 'push' | 'in-app' | 'chat';

/**
 * Command for automatically translating content using OpenAI
 *
 * This command is used when:
 * - Initial translation setup (auto-translate all content)
 * - Content updates (re-translate modified content)
 * - Adding new target locales (translate to new language)
 *
 * The auto-translate process:
 * 1. Extract translatable content from source
 * 2. Identify target locales from org settings or override
 * 3. Call OpenAI for each target locale
 * 4. Validate and store translated content
 * 5. Handle failures with retry and partial results
 *
 * @example
 * ```typescript
 * const command = AutoTranslateCommand.create({
 *   resourceId: 'my-workflow',
 *   resourceType: LocalizationResourceEnum.WORKFLOW,
 *   organizationId: 'org_123',
 *   environmentId: 'env_456',
 *   userId: 'user_789',
 *   sourceContent: {
 *     'step.email.subject': 'Welcome to {{company}}!',
 *     'step.email.body': '<p>Hello {{name}},</p><p>Thank you for joining us.</p>',
 *   },
 *   targetLocales: ['es_ES', 'fr_FR', 'de_DE'], // Optional override
 * });
 *
 * const result = await autoTranslate.execute(command);
 * // result contains translated content for each locale
 * ```
 */
export class AutoTranslateCommand {
  /**
   * Resource identifier (workflow slug or layout identifier)
   */
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  /**
   * Internal resource ID (MongoDB ObjectId)
   */
  @IsMongoId()
  @IsOptional()
  resourceInternalId?: string;

  /**
   * Type of resource being translated
   */
  @IsEnum(LocalizationResourceEnum)
  @IsNotEmpty()
  resourceType: LocalizationResourceEnum;

  /**
   * Organization ID (used for settings lookup)
   */
  @IsMongoId()
  @IsNotEmpty()
  organizationId: string;

  /**
   * Environment ID
   */
  @IsMongoId()
  @IsNotEmpty()
  environmentId: string;

  /**
   * User requesting the translation
   */
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  /**
   * Optional: Override default target locales from org settings
   * Array of BCP-47 locale codes (e.g., ['es_ES', 'fr_FR'])
   */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetLocales?: string[];

  /**
   * Optional: Source locale override (default from org settings)
   */
  @IsString()
  @IsOptional()
  sourceLocale?: string;

  /**
   * Content to translate, keyed by content identifier
   * Key format: 'step.<stepId>.<field>' or 'layout.<field>'
   *
   * @example
   * {
   *   'step.email-1.subject': 'Welcome!',
   *   'step.email-1.body': '<p>Hello {{name}}</p>',
   *   'step.sms-1.content': 'Hi {{name}}, thanks for signing up!',
   * }
   */
  @IsObject()
  @IsNotEmpty()
  sourceContent: Record<string, string>;

  /**
   * Optional: Content type hint for better translation quality
   * Used when all content is of the same type
   */
  @IsString()
  @IsOptional()
  contentType?: TranslationContentType;

  /**
   * Optional: Custom instructions for translation
   * E.g., "Use formal language" or "Keep technical terms in English"
   */
  @IsString()
  @IsOptional()
  customInstructions?: string;

  /**
   * Optional: Skip validation step for faster processing
   * Not recommended for production use
   */
  @IsOptional()
  skipValidation?: boolean;

  /**
   * Optional MongoDB session for transaction support
   */
  @IsOptional()
  session?: ClientSession | null;

  /**
   * Create and validate a command instance
   */
  static create(data: Omit<AutoTranslateCommand, 'session'> & { session?: ClientSession | null }): AutoTranslateCommand {
    const command = new AutoTranslateCommand();
    Object.assign(command, data);
    return command;
  }
}

/**
 * Result for a single locale translation
 */
export interface LocaleTranslateResult {
  /**
   * Target locale code
   */
  locale: string;

  /**
   * Whether translation was successful
   */
  success: boolean;

  /**
   * Translated content by key (matches sourceContent keys)
   */
  content?: Record<string, string>;

  /**
   * Error message if translation failed
   */
  error?: string;

  /**
   * Validation warnings (non-fatal issues)
   */
  warnings?: string[];
}

/**
 * Complete result from auto-translate operation
 */
export interface AutoTranslateResult {
  /**
   * Overall success status (true if all locales succeeded)
   */
  success: boolean;

  /**
   * Source locale used for translation
   */
  sourceLocale: string;

  /**
   * Results for each target locale
   */
  results: LocaleTranslateResult[];

  /**
   * Total processing metadata
   */
  metadata: {
    totalLocales: number;
    successfulLocales: number;
    failedLocales: number;
    totalTokensUsed: number;
    totalLatencyMs: number;
  };

  /**
   * ID of the LocalizationGroup where translations were stored
   */
  localizationGroupId?: string;
}
