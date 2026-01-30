import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Optional,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';

import { AutoTranslate, AutoTranslateCommand } from '../usecases/auto-translate';
import {
  EnqueueTranslation,
  EnqueueTranslationCommand,
  EnqueueTranslationResourceTypeEnum,
} from '../usecases/enqueue-translation';
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
    private readonly autoTranslate: AutoTranslate,
    @Optional() private readonly enqueueTranslation: EnqueueTranslation | null
  ) {}

  /**
   * Trigger automatic translation for a resource
   *
   * Translates the provided content to all configured target locales
   * (or specified override locales). The translations are stored
   * in the database and can be used for localized notifications.
   *
   * Supports two modes:
   * - Synchronous (default): Waits for translation to complete and returns results
   * - Asynchronous (async=true): Enqueues job and returns job reference for polling
   *
   * Process (sync mode):
   * 1. Validate request and get org translation settings
   * 2. Tokenize variables in content to protect during translation
   * 3. Call OpenAI for each target locale
   * 4. Validate translated content
   * 5. Store in LocalizationGroup/Localization
   * 6. Return results with metadata
   *
   * Process (async mode):
   * 1. Validate request
   * 2. Enqueue job to translation queue
   * 3. Return job reference ID immediately
   * 4. Poll /translations/status/:jobId for results
   *
   * @param user - Authenticated user session
   * @param dto - Translation request with content and options
   * @param async - If true, enqueue for background processing
   * @returns Translation results (sync) or job reference (async)
   */
  @Post('auto-translate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-translate content',
    description: 'Translates content to all configured target locales using OpenAI. Set async=true for background processing.',
  })
  @ApiQuery({
    name: 'async',
    required: false,
    type: Boolean,
    description: 'If true, enqueue job for background processing and return job reference',
  })
  async triggerAutoTranslate(
    @UserSession() user: UserSessionData,
    @Body() dto: AutoTranslateRequestDto,
    @Query('async') asyncMode?: string
  ): Promise<AutoTranslateResponseDto> {
    const isAsync = asyncMode === 'true' || asyncMode === '1';

    this.logger.log(
      `Auto-translate requested for resource: ${dto.resourceId} (${dto.resourceType}) by org: ${user.organizationId} [async=${isAsync}]`
    );

    // Async mode: enqueue job and return immediately
    if (isAsync) {
      return await this.handleAsyncTranslation(user, dto);
    }

    // Sync mode: process immediately
    return await this.handleSyncTranslation(user, dto);
  }

  /**
   * Handle synchronous translation - process immediately and wait for result
   */
  private async handleSyncTranslation(
    user: UserSessionData,
    dto: AutoTranslateRequestDto
  ): Promise<AutoTranslateResponseDto> {
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
   * Handle asynchronous translation - enqueue job and return reference
   */
  private async handleAsyncTranslation(
    user: UserSessionData,
    dto: AutoTranslateRequestDto
  ): Promise<AutoTranslateResponseDto> {
    if (!this.enqueueTranslation) {
      this.logger.warn('Async translation requested but EnqueueTranslation not available');

      return {
        success: false,
        sourceLocale: dto.sourceLocale || 'en_US',
        results: [{
          locale: 'all',
          success: false,
          error: 'Async translation not available. Use sync mode or contact support.',
        }],
        metadata: {
          totalLocales: 0,
          successfulLocales: 0,
          failedLocales: 1,
          totalTokensUsed: 0,
          totalLatencyMs: 0,
        },
      };
    }

    // Map resource type
    const resourceTypeEnum = dto.resourceType === 'workflow'
      ? EnqueueTranslationResourceTypeEnum.WORKFLOW
      : EnqueueTranslationResourceTypeEnum.LAYOUT;

    const result = await this.enqueueTranslation.execute(
      EnqueueTranslationCommand.create({
        resourceId: dto.resourceId,
        resourceInternalId: dto.resourceInternalId,
        resourceType: resourceTypeEnum,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        sourceContent: dto.sourceContent,
        targetLocales: dto.targetLocales,
        sourceLocale: dto.sourceLocale,
        contentType: dto.contentType,
        customInstructions: dto.customInstructions,
      })
    );

    if (!result.success) {
      return {
        success: false,
        sourceLocale: dto.sourceLocale || 'en_US',
        results: [{
          locale: 'all',
          success: false,
          error: result.error || 'Failed to enqueue translation job',
        }],
        metadata: {
          totalLocales: 0,
          successfulLocales: 0,
          failedLocales: 1,
          totalTokensUsed: 0,
          totalLatencyMs: 0,
        },
      };
    }

    this.logger.log(`Translation job enqueued: ${result.jobReferenceId}`);

    // Return job reference for polling
    return {
      success: true,
      sourceLocale: dto.sourceLocale || 'en_US',
      results: [{
        locale: 'pending',
        success: true,
      }],
      metadata: {
        totalLocales: dto.targetLocales?.length || 0,
        successfulLocales: 0,
        failedLocales: 0,
        totalTokensUsed: 0,
        totalLatencyMs: 0,
      },
      jobReferenceId: result.jobReferenceId,
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
