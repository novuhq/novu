import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { LocalizationResourceEnum } from '../usecases/auto-translate/auto-translate.command';

/**
 * Supported content types for translation
 * Helps the AI provide better quality translations
 */
export type TranslationContentType = 'email' | 'sms' | 'push' | 'in-app' | 'chat';

/**
 * DTO for auto-translate request
 *
 * Triggers automatic translation of content using OpenAI.
 * The content is translated to all configured target locales
 * (or the specified override locales).
 *
 * @example
 * ```typescript
 * // Translate workflow content
 * {
 *   resourceId: 'welcome-email',
 *   resourceInternalId: '507f1f77bcf86cd799439011',
 *   resourceType: 'workflow',
 *   sourceContent: {
 *     'step.email-1.subject': 'Welcome to {{company}}!',
 *     'step.email-1.body': '<p>Hello {{name}},</p><p>Thanks for joining!</p>'
 *   },
 *   targetLocales: ['es_ES', 'fr_FR']
 * }
 * ```
 */
export class AutoTranslateRequestDto {
  /**
   * External resource identifier (workflow slug or layout identifier)
   */
  @ApiProperty({
    description: 'Resource identifier (workflow slug or layout identifier)',
    example: 'welcome-email-workflow',
  })
  @IsString()
  @IsNotEmpty({ message: 'Resource ID is required' })
  resourceId: string;

  /**
   * Internal MongoDB ObjectId of the resource
   * Required for storing translations in the correct location
   */
  @ApiPropertyOptional({
    description: 'Internal resource ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'Resource internal ID must be a valid MongoDB ObjectId' })
  resourceInternalId?: string;

  /**
   * Type of resource being translated
   */
  @ApiProperty({
    description: 'Type of resource being translated',
    enum: LocalizationResourceEnum,
    example: LocalizationResourceEnum.WORKFLOW,
  })
  @IsEnum(LocalizationResourceEnum, {
    message: `Resource type must be one of: ${Object.values(LocalizationResourceEnum).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Resource type is required' })
  resourceType: LocalizationResourceEnum;

  /**
   * Optional: Override target locales (defaults to org settings)
   */
  @ApiPropertyOptional({
    description: 'Target locales to translate to (overrides org settings)',
    type: [String],
    example: ['es_ES', 'fr_FR', 'de_DE'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-z]{2}_[A-Z]{2}$/, {
    each: true,
    message: 'Each locale must be in format: xx_XX (e.g., en_US, es_ES)',
  })
  targetLocales?: string[];

  /**
   * Optional: Source locale override (defaults to org settings)
   */
  @ApiPropertyOptional({
    description: 'Source locale (overrides org settings)',
    example: 'en_US',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}_[A-Z]{2}$/, {
    message: 'Locale must be in format: xx_XX (e.g., en_US, es_ES)',
  })
  sourceLocale?: string;

  /**
   * Content to translate, keyed by content path
   * Keys should follow the format: 'step.<stepId>.<field>'
   */
  @ApiProperty({
    description: 'Content to translate, keyed by content path',
    example: {
      'step.email-1.subject': 'Welcome to {{company}}!',
      'step.email-1.body': '<p>Hello {{name}},</p><p>Thanks for joining!</p>',
      'step.sms-1.content': 'Welcome {{name}}! Your code is {{code}}.',
    },
  })
  @IsObject()
  @IsNotEmpty({ message: 'Source content is required' })
  sourceContent: Record<string, string>;

  /**
   * Optional: Content type hint for better translation quality
   */
  @ApiPropertyOptional({
    description: 'Content type hint for better translation quality',
    enum: ['email', 'sms', 'push', 'in-app', 'chat'],
    example: 'email',
  })
  @IsOptional()
  @IsString()
  contentType?: TranslationContentType;

  /**
   * Optional: Custom instructions for the translation
   * E.g., "Use formal language" or "Keep technical terms in English"
   */
  @ApiPropertyOptional({
    description: 'Custom instructions for translation',
    example: 'Use formal language (usted) for Spanish translations',
  })
  @IsOptional()
  @IsString()
  customInstructions?: string;

  /**
   * Optional: Skip validation step for faster processing
   * Not recommended for production use
   */
  @ApiPropertyOptional({
    description: 'Skip validation step (not recommended)',
    example: false,
  })
  @IsOptional()
  skipValidation?: boolean;
}
