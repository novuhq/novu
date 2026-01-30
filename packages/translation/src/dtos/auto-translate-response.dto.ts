import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Translation result for a single locale
 */
export class LocaleTranslationResultDto {
  @ApiProperty({
    description: 'Target locale code',
    example: 'es_ES',
  })
  locale: string;

  @ApiProperty({
    description: 'Whether translation for this locale succeeded',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Translated content by key (matches input keys)',
    example: {
      'step.email-1.subject': 'Bienvenido a {{company}}!',
      'step.email-1.body': '<p>Hola {{name}},</p><p>Gracias por unirte!</p>',
    },
  })
  content?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Error message if translation failed',
    example: 'Rate limit exceeded',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Non-fatal warnings (validation issues, etc.)',
    type: [String],
    example: ['step.email-1.body: Potential HTML tag mismatch'],
  })
  warnings?: string[];
}

/**
 * Translation metadata
 */
export class TranslationMetadataDto {
  @ApiProperty({
    description: 'Total number of locales attempted',
    example: 3,
  })
  totalLocales: number;

  @ApiProperty({
    description: 'Number of successful translations',
    example: 2,
  })
  successfulLocales: number;

  @ApiProperty({
    description: 'Number of failed translations',
    example: 1,
  })
  failedLocales: number;

  @ApiProperty({
    description: 'Estimated tokens used (for billing)',
    example: 1500,
  })
  totalTokensUsed: number;

  @ApiProperty({
    description: 'Total processing time in milliseconds',
    example: 4523,
  })
  totalLatencyMs: number;
}

/**
 * Response DTO for auto-translate operation
 *
 * Returns the translation results for all target locales,
 * including any errors or warnings encountered.
 *
 * @example Success Response
 * ```json
 * {
 *   "success": true,
 *   "sourceLocale": "en_US",
 *   "results": [
 *     {
 *       "locale": "es_ES",
 *       "success": true,
 *       "content": {
 *         "step.email-1.subject": "Bienvenido a {{company}}!"
 *       }
 *     }
 *   ],
 *   "metadata": {
 *     "totalLocales": 2,
 *     "successfulLocales": 2,
 *     "failedLocales": 0,
 *     "totalTokensUsed": 1500,
 *     "totalLatencyMs": 4523
 *   },
 *   "localizationGroupId": "507f1f77bcf86cd799439011"
 * }
 * ```
 */
export class AutoTranslateResponseDto {
  /**
   * Overall success status (true if all locales succeeded)
   */
  @ApiProperty({
    description: 'Whether all translations succeeded',
    example: true,
  })
  success: boolean;

  /**
   * Source locale used for translation
   */
  @ApiProperty({
    description: 'Source locale used for translation',
    example: 'en_US',
  })
  sourceLocale: string;

  /**
   * Results for each target locale
   */
  @ApiProperty({
    description: 'Translation results for each target locale',
    type: [LocaleTranslationResultDto],
  })
  results: LocaleTranslationResultDto[];

  /**
   * Processing metadata
   */
  @ApiProperty({
    description: 'Processing metadata',
    type: TranslationMetadataDto,
  })
  metadata: TranslationMetadataDto;

  /**
   * ID of the LocalizationGroup where translations were stored
   */
  @ApiPropertyOptional({
    description: 'ID of the LocalizationGroup where translations are stored',
    example: '507f1f77bcf86cd799439011',
  })
  localizationGroupId?: string;
}
