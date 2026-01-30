import { Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  getTranslationWorkerOptions,
  ITranslationDataDto,
  Job,
  PinoLogger,
  Store,
  storage,
  TranslationWorkerService,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { ObservabilityBackgroundTransactionEnum, TranslationJobStatusEnum } from '@novu/shared';
import {
  AutoTranslate,
  AutoTranslateCommand,
  LocalizationResourceEnum,
} from '@novu/translation';

const nr = require('newrelic');

const LOG_CONTEXT = 'TranslationWorker';

/**
 * TranslationWorker
 *
 * Background worker that processes translation jobs from the translation queue.
 * This worker handles asynchronous translation requests, calling the AutoTranslate
 * usecase to perform the actual translation via OpenAI.
 *
 * Features:
 * - Organization validation before processing
 * - NewRelic transaction tracing for observability
 * - Context propagation via AsyncLocalStorage
 * - Graceful error handling with job failure tracking
 * - Exponential backoff retry strategy (configured in queue)
 *
 * Job Processing Flow:
 * 1. Validate organization exists
 * 2. Extract job data and parameters
 * 3. Start NewRelic background transaction
 * 4. Execute AutoTranslate usecase
 * 5. Handle success/failure and log results
 */
@Injectable()
export class TranslationWorker extends TranslationWorkerService {
  constructor(
    private autoTranslate: AutoTranslate,
    private organizationRepository: CommunityOrganizationRepository,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());

    this.worker.on('failed', async (job: Job<ITranslationDataDto, void, string>, error: Error): Promise<void> => {
      await this.jobHasFailed(job, error);
    });

    this.worker.on('completed', async (job: Job<ITranslationDataDto, void, string>): Promise<void> => {
      await this.jobHasCompleted(job);
    });
  }

  /**
   * Get worker options with configured concurrency and lock duration
   */
  private getWorkerOptions(): WorkerOptions {
    return getTranslationWorkerOptions();
  }

  /**
   * Get the worker processor function
   *
   * This processor handles each translation job, validating the organization
   * and delegating to the AutoTranslate usecase for actual translation work.
   */
  private getWorkerProcessor() {
    return async ({ data }: { data: ITranslationDataDto }) => {
      // Check for skip flag (used for cancelled or shadow mode jobs)
      if (data.skipProcessing) {
        Logger.log(`Skipping translation job - skipProcessing flag is set`, LOG_CONTEXT);
        return;
      }

      const { _organizationId, _environmentId, _userId, resourceId, jobReferenceId } = data;

      // Validate organization exists
      const organizationExists = await this.organizationExist(_organizationId);
      if (!organizationExists) {
        Logger.warn(
          `Organization not found: ${_organizationId}. Skipping translation job.`,
          LOG_CONTEXT
        );
        return;
      }

      Logger.log(
        `Processing translation job for resource ${resourceId} (ref: ${jobReferenceId})`,
        LOG_CONTEXT
      );

      // Process with NewRelic transaction tracing
      return await new Promise((resolve, reject) => {
        const _this = this;

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.TRANSLATION_QUEUE,
          'Translation Engine',
          function processTask() {
            const transaction = nr.getTransaction();

            storage.run(new Store(PinoLogger.root), () => {
              _this
                .executeTranslation(data)
                .then((result) => {
                  Logger.log(
                    `Translation job completed for ${resourceId}: ${result.metadata.successfulLocales}/${result.metadata.totalLocales} locales`,
                    LOG_CONTEXT
                  );
                  resolve(result);
                })
                .catch((error) => {
                  Logger.error(
                    error,
                    `Failed to execute translation job for ${resourceId}`,
                    LOG_CONTEXT
                  );
                  reject(error);
                })
                .finally(() => {
                  transaction.end();
                });
            });
          }
        );
      });
    };
  }

  /**
   * Execute the translation using the AutoTranslate usecase
   */
  private async executeTranslation(data: ITranslationDataDto) {
    const {
      _organizationId,
      _environmentId,
      _userId,
      resourceId,
      resourceInternalId,
      resourceType,
      targetLocales,
      sourceLocale,
      sourceContent,
      contentType,
      customInstructions,
    } = data;

    // Convert resource type to LocalizationResourceEnum
    const localizationResourceType = this.mapResourceType(resourceType);

    // Create and execute the auto-translate command
    const command = AutoTranslateCommand.create({
      resourceId,
      resourceInternalId,
      resourceType: localizationResourceType,
      organizationId: _organizationId,
      environmentId: _environmentId,
      userId: _userId,
      targetLocales,
      sourceLocale,
      sourceContent,
      contentType,
      customInstructions,
    });

    return await this.autoTranslate.execute(command);
  }

  /**
   * Map the shared TranslationResourceTypeEnum to LocalizationResourceEnum
   */
  private mapResourceType(resourceType: string): LocalizationResourceEnum {
    switch (resourceType) {
      case 'workflow':
        return LocalizationResourceEnum.WORKFLOW;
      case 'layout':
        return LocalizationResourceEnum.LAYOUT;
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Handle job completion event
   */
  private async jobHasCompleted(job: Job<ITranslationDataDto, void, string>): Promise<void> {
    const { resourceId, jobReferenceId } = job.data;

    Logger.log(
      `Translation job completed successfully: ${resourceId} (ref: ${jobReferenceId})`,
      LOG_CONTEXT
    );

    // Future: Update job status in database if tracking is implemented
  }

  /**
   * Handle job failure event
   */
  private async jobHasFailed(job: Job<ITranslationDataDto, void, string>, error: Error): Promise<void> {
    const { resourceId, jobReferenceId } = job.data;
    const hasReachedMaxAttempts = job.attemptsMade >= this.DEFAULT_ATTEMPTS;

    nr.noticeError(error);

    Logger.error(
      error,
      `Translation job failed: ${resourceId} (ref: ${jobReferenceId}), attempt ${job.attemptsMade}/${this.DEFAULT_ATTEMPTS}`,
      LOG_CONTEXT
    );

    if (hasReachedMaxAttempts) {
      Logger.error(
        `Translation job ${resourceId} has reached max attempts. Marking as permanently failed.`,
        LOG_CONTEXT
      );

      // Future: Update job status in database if tracking is implemented
    }
  }

  /**
   * Check if the organization exists
   */
  private async organizationExist(organizationId: string): Promise<boolean> {
    const organization = await this.organizationRepository.findOne({ _id: organizationId });
    return !!organization;
  }
}
