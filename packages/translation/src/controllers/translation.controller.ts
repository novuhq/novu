import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';

import { AutoTranslate, AutoTranslateCommand } from '../usecases/auto-translate';
import {
  AutoTranslateRequestDto,
  AutoTranslateResponseDto,
  TranslationStatusDto,
  TranslationJobStatus,
} from '../dtos';

/**
 * Controller for translation operations
 *
 * Provides endpoints to:
 * - Trigger automatic translation for resources
 * - Check translation job status (for async jobs in Phase 7)
 *
 * The auto-translate endpoint:
 * 1. Receives content to translate
 * 2. Uses organization's OpenAI settings
 * 3. Translates to all configured target locales
 * 4. Stores translations in LocalizationGroup/Localization
 * 5. Returns results with any warnings/errors
 *
 * Note: This controller is designed to be imported into apps/api
 * during Phase 5 integration.
 */
@Controller('translations')
@ApiTags('Translations')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController() // Hidden from public docs until Phase 5
export class TranslationController {
  private readonly logger = new Logger(TranslationController.name);

  constructor(
    private readonly autoTranslate: AutoTranslate
  ) {}

  /**
   * Trigger automatic translation for a resource
   *
   * Translates the provided content to all configured target locales
   * (or specified override locales). The translations are stored
   * in the database and can be used for localized notifications.
   *
   * Process:
   * 1. Validate request and get org translation settings
   * 2. Tokenize variables in content to protect during translation
   * 3. Call OpenAI for each target locale
   * 4. Validate translated content
   * 5. Store in LocalizationGroup/Localization
   * 6. Return results with metadata
   *
   * @param user - Authenticated user session
   * @param dto - Translation request with content and options
   * @returns Translation results for each locale
   */
  @Post('auto-translate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-translate content',
    description: 'Translates content to all configured target locales using OpenAI.',
  })
  async triggerAutoTranslate(
    @UserSession() user: UserSessionData,
    @Body() dto: AutoTranslateRequestDto
  ): Promise<AutoTranslateResponseDto> {
    this.logger.log(
      `Auto-translate requested for resource: ${dto.resourceId} (${dto.resourceType}) by org: ${user.organizationId}`
    );

    const startTime = Date.now();

    const result = await this.autoTranslate.execute(
      AutoTranslateCommand.create({
        resourceId: dto.resourceId,
        resourceInternalId: dto.resourceInternalId,
        resourceType: dto.resourceType,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        sourceContent: dto.sourceContent,
        targetLocales: dto.targetLocales,
        sourceLocale: dto.sourceLocale,
        contentType: dto.contentType,
        customInstructions: dto.customInstructions,
        skipValidation: dto.skipValidation,
      })
    );

    const totalTime = Date.now() - startTime;

    this.logger.log(
      `Auto-translate completed for ${dto.resourceId}: ` +
      `${result.metadata.successfulLocales}/${result.metadata.totalLocales} locales ` +
      `in ${totalTime}ms`
    );

    return {
      success: result.success,
      sourceLocale: result.sourceLocale,
      results: result.results.map((r) => ({
        locale: r.locale,
        success: r.success,
        content: r.content,
        error: r.error,
        warnings: r.warnings,
      })),
      metadata: {
        totalLocales: result.metadata.totalLocales,
        successfulLocales: result.metadata.successfulLocales,
        failedLocales: result.metadata.failedLocales,
        totalTokensUsed: result.metadata.totalTokensUsed,
        totalLatencyMs: result.metadata.totalLatencyMs,
      },
      localizationGroupId: result.localizationGroupId,
    };
  }

  /**
   * Get translation job status (Placeholder for Phase 7)
   *
   * Returns the current status of an async translation job.
   * This is a placeholder implementation for Phase 7 background jobs.
   *
   * In Phase 7, this will:
   * 1. Look up the job in the job queue or status table
   * 2. Return current progress for each locale
   * 3. Include partial results if available
   * 4. Support long polling or webhooks for completion
   *
   * @param jobId - Translation job identifier
   * @returns Job status with progress information
   */
  @Get('status/:jobId')
  @ApiOperation({
    summary: 'Get translation job status',
    description: 'Returns the status of an async translation job (Phase 7 placeholder).',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Translation job identifier',
    example: 'job_507f1f77bcf86cd799439011',
  })
  async getTranslationStatus(
    @Param('jobId') jobId: string
  ): Promise<TranslationStatusDto> {
    this.logger.debug(`Getting translation status for job: ${jobId}`);

    // Phase 7 Placeholder: Return a stub response
    // In Phase 7, this will query the actual job queue or status table

    return {
      jobId,
      status: TranslationJobStatus.PENDING,
      progress: {
        completed: 0,
        total: 0,
        percentage: 0,
      },
      locales: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Note: Actual implementation in Phase 7 will:
      // 1. Query Bull queue for job status
      // 2. Return actual progress from job data
      // 3. Include partial results if available
    };
  }

  /**
   * Batch auto-translate (Future enhancement)
   *
   * Placeholder for batch translation endpoint that could:
   * - Accept multiple resources at once
   * - Process in parallel with rate limiting
   * - Return aggregated results
   *
   * This could be added in a future phase if needed.
   */
  // @Post('batch-auto-translate')
  // async batchAutoTranslate(
  //   @UserSession() user: UserSessionData,
  //   @Body() dto: BatchAutoTranslateRequestDto
  // ): Promise<BatchAutoTranslateResponseDto> {
  //   // Future implementation
  // }
}
