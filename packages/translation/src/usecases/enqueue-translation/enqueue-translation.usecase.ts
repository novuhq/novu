import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { TranslationQueueService } from '@novu/application-generic';
import { ITranslationJobData, JobTopicNameEnum, TranslationResourceTypeEnum } from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';

import {
  EnqueueTranslationCommand,
  EnqueueTranslationResourceTypeEnum,
  EnqueueTranslationResult,
} from './enqueue-translation.command';

/**
 * EnqueueTranslation Usecase
 *
 * Enqueues a translation job for asynchronous processing by the TranslationWorker.
 *
 * Use this usecase when:
 * - Content is large and may take time to translate
 * - You want to return immediately and process in background
 * - You're handling batch operations
 *
 * The job will be processed by the TranslationWorker which calls AutoTranslate.
 *
 * @example
 * ```typescript
 * const result = await enqueueTranslation.execute(
 *   EnqueueTranslationCommand.create({
 *     resourceId: 'my-workflow',
 *     resourceType: EnqueueTranslationResourceTypeEnum.WORKFLOW,
 *     organizationId: 'org_123',
 *     environmentId: 'env_456',
 *     userId: 'user_789',
 *     sourceContent: { ... },
 *   })
 * );
 *
 * if (result.success) {
 *   // Return job reference for status polling
 *   return { jobId: result.jobReferenceId };
 * }
 * ```
 */
@Injectable()
export class EnqueueTranslation {
  private readonly logger = new Logger(EnqueueTranslation.name);

  constructor(
    @Optional()
    @Inject(TranslationQueueService)
    private readonly translationQueueService: TranslationQueueService | null
  ) {}

  /**
   * Execute the enqueue translation command
   *
   * @param command - The command containing translation request details
   * @returns Result with job reference ID for status tracking
   */
  async execute(command: EnqueueTranslationCommand): Promise<EnqueueTranslationResult> {
    const {
      resourceId,
      resourceInternalId,
      resourceType,
      organizationId,
      environmentId,
      userId,
      targetLocales,
      sourceLocale,
      sourceContent,
      contentType,
      customInstructions,
    } = command;

    // Check if queue service is available
    if (!this.translationQueueService) {
      this.logger.warn(
        'TranslationQueueService not available. Background translation not configured.',
        EnqueueTranslation.name
      );

      return {
        success: false,
        jobReferenceId: '',
        queueName: JobTopicNameEnum.TRANSLATION,
        error: 'Translation queue service not available',
        enqueuedAt: new Date().toISOString(),
      };
    }

    // Generate unique job reference ID
    const jobReferenceId = `trans_${uuidv4()}`;
    const jobName = `translate-${resourceType}-${resourceId}-${Date.now()}`;

    this.logger.log(
      `Enqueueing translation job: ${jobName} (ref: ${jobReferenceId})`
    );

    try {
      // Create job data
      const jobData: ITranslationJobData = {
        _organizationId: organizationId,
        _environmentId: environmentId,
        _userId: userId,
        resourceId,
        resourceInternalId,
        resourceType: this.mapResourceType(resourceType),
        targetLocales,
        sourceLocale,
        sourceContent,
        contentType,
        customInstructions,
        jobReferenceId,
        createdAt: new Date().toISOString(),
      };

      // Add to queue with groupId for organization-level rate limiting
      await this.translationQueueService.add({
        name: jobName,
        data: jobData,
        groupId: `translation-${organizationId}`,
      });

      this.logger.log(
        `Translation job enqueued successfully: ${jobReferenceId}`
      );

      return {
        success: true,
        jobReferenceId,
        queueName: JobTopicNameEnum.TRANSLATION,
        enqueuedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to enqueue translation job: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );

      return {
        success: false,
        jobReferenceId,
        queueName: JobTopicNameEnum.TRANSLATION,
        error: errorMessage,
        enqueuedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Map local resource type enum to shared enum
   */
  private mapResourceType(resourceType: EnqueueTranslationResourceTypeEnum): TranslationResourceTypeEnum {
    switch (resourceType) {
      case EnqueueTranslationResourceTypeEnum.WORKFLOW:
        return TranslationResourceTypeEnum.WORKFLOW;
      case EnqueueTranslationResourceTypeEnum.LAYOUT:
        return TranslationResourceTypeEnum.LAYOUT;
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }
}
