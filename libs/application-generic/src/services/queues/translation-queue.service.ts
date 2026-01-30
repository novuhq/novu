import { Injectable, Logger } from '@nestjs/common';
import { ITranslationJobData, JobTopicNameEnum } from '@novu/shared';

import { BullMqService, QueueOptions } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { IBulkJobParams, IJobParams, QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'TranslationQueueService';

/**
 * Job parameters for adding a translation job to the queue
 */
export interface ITranslationJobParams extends IJobParams {
  data: ITranslationJobData;
}

/**
 * Bulk job parameters for adding multiple translation jobs
 */
export interface ITranslationBulkJobParams extends IBulkJobParams {
  data: ITranslationJobData;
}

/**
 * TranslationQueueService
 *
 * Queue service for managing translation jobs. This service is used by the API
 * to enqueue translation jobs for asynchronous processing by the TranslationWorker.
 *
 * Features:
 * - Exponential backoff retry strategy for failed jobs
 * - Job deduplication via groupId
 * - Configurable attempts and delays
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class TranslationController {
 *   constructor(private translationQueue: TranslationQueueService) {}
 *
 *   async triggerTranslation(resourceId: string) {
 *     await this.translationQueue.add({
 *       name: `translate-${resourceId}`,
 *       data: {
 *         _organizationId: 'org_123',
 *         _environmentId: 'env_456',
 *         _userId: 'user_789',
 *         resourceId: 'my-workflow',
 *         resourceType: TranslationResourceTypeEnum.WORKFLOW,
 *         sourceContent: { 'step.email.subject': 'Hello!' },
 *       },
 *       groupId: `translation-${resourceId}`,
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class TranslationQueueService extends QueueBaseService {
  constructor(public workflowInMemoryProviderService: WorkflowInMemoryProviderService) {
    super(JobTopicNameEnum.TRANSLATION, new BullMqService(workflowInMemoryProviderService));

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue(this.getOverrideOptions());
  }

  /**
   * Add a single translation job to the queue
   *
   * @param data - Job parameters including translation data
   */
  public async add(data: ITranslationJobParams): Promise<void> {
    Logger.log(
      `Adding translation job: ${data.name} for resource ${data.data.resourceId}`,
      LOG_CONTEXT
    );

    return await super.add(data);
  }

  /**
   * Add multiple translation jobs to the queue in bulk
   *
   * @param data - Array of job parameters
   */
  public async addBulk(data: ITranslationBulkJobParams[]): Promise<void> {
    Logger.log(`Adding ${data.length} translation jobs in bulk`, LOG_CONTEXT);

    return await super.addBulk(data);
  }

  /**
   * Get queue options with exponential backoff retry strategy
   *
   * Configuration:
   * - 5 attempts max (initial + 4 retries)
   * - Exponential backoff starting at 5 seconds
   * - Jobs are removed on completion and failure to avoid queue bloat
   */
  private getOverrideOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          delay: 5000, // 5 seconds initial delay
          type: 'exponential',
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    };
  }
}
