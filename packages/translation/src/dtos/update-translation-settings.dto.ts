import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { OpenAIModelEnum } from '../dal';

/**
 * DTO for updating translation settings
 *
 * All fields are optional to support partial updates.
 * The API key is stored encrypted in the database.
 *
 * @example
 * ```typescript
 * // Update only the model
 * { openaiModel: OpenAIModelEnum.GPT_4O }
 *
 * // Update locales
 * {
 *   defaultLocale: 'en_US',
 *   targetLocales: ['es_ES', 'fr_FR', 'de_DE']
 * }
 *
 * // Full update
 * {
 *   openaiApiKey: 'sk-...',
 *   openaiModel: OpenAIModelEnum.GPT_4O_MINI,
 *   defaultLocale: 'en_US',
 *   targetLocales: ['es_ES', 'fr_FR']
 * }
 * ```
 */
export class UpdateTranslationSettingsDto {
  /**
   * OpenAI API key for translation
   * Must start with 'sk-' and be a valid key format
   * This key will be encrypted before storage
   */
  @ApiPropertyOptional({
    description: 'OpenAI API key for translation (will be encrypted)',
    example: 'sk-proj-xxxxxxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'API key is too short' })
  @MaxLength(200, { message: 'API key is too long' })
  @Matches(/^sk-[a-zA-Z0-9_-]+$/, {
    message: 'API key must be a valid OpenAI key format (starts with sk-)',
  })
  openaiApiKey?: string;

  /**
   * OpenAI model to use for translation
   * Different models have different cost/quality tradeoffs
   */
  @ApiPropertyOptional({
    description: 'OpenAI model for translation',
    enum: OpenAIModelEnum,
    example: OpenAIModelEnum.GPT_4O_MINI,
  })
  @IsOptional()
  @IsEnum(OpenAIModelEnum, {
    message: `Model must be one of: ${Object.values(OpenAIModelEnum).join(', ')}`,
  })
  openaiModel?: OpenAIModelEnum;

  /**
   * Default source locale for translations
   * Must be a valid BCP-47/underscore format locale code
   */
  @ApiPropertyOptional({
    description: 'Default source locale (BCP-47 format with underscore)',
    example: 'en_US',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}_[A-Z]{2}$/, {
    message: 'Locale must be in format: xx_XX (e.g., en_US, es_ES)',
  })
  defaultLocale?: string;

  /**
   * Target locales for translation
   * Each must be a valid BCP-47/underscore format locale code
   */
  @ApiPropertyOptional({
    description: 'Target locales for translation',
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
}
