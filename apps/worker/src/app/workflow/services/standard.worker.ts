import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  FeatureFlagsService,
  getStandardWorkerOptions,
  ISqsFailureOutcome,
  IStandardDataDto,
  isWebhookFilterSsrfBlockedError,
  Job,
  PinoLogger,
  SqsService,
  StandardWorkerService,
  Store,
  storage,
  UnrecoverableError,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, JobRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, JobStatusEnum, ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import {
  HandleLastFailedJob,
  HandleLastFailedJobCommand,
  RunJob,
  RunJobCommand,
  SetJobAsFailed,
  SetJobAsFailedCommand,
  WebhookFilterBackoffStrategy,
} from '../usecases';

const nr = require('newrelic');

const LOG_CONTEXT = 'StandardWorker';

@Injectable()
export class StandardWorker extends StandardWorkerService {
  constructor(
    private handleLastFailedJob: HandleLastFailedJob,
    private runJob: RunJob,
    @Inject(forwardRef(() => SetJobAsFailed)) private setJobAsFailed: SetJobAsFailed,
    @Inject(forwardRef(() => WebhookFilterBackoffStrategy))
    private webhookFilterBackoffStrategy: WebhookFilterBackoffStrategy,
    @Inject(forwardRef(() => WorkflowInMemoryProviderService))
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private organizationRepository: CommunityOrganizationRepository,
    private jobRepository: JobRepository,
    sqsService: SqsService,
    logger: PinoLogger,
    private featureFlagsService: FeatureFlagsService
  ) {
    super(new BullMqService(workflowInMemoryProviderService), sqsService, logger);

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions(), true);

    /*
     * Shadow copies created during the SQS migration (shadow/live modes) carry
     * `skipProcessing` and must not touch the job status in the DB: the BullMQ
     * `completed` event fires even when the processor skipped the job, and
     * without this guard the shadow would flip a job to COMPLETED while the
     * real execution on the other backend is still running (or has failed and
     * is awaiting a retry).
     */
    this.bullMqWorker.on('failed', async (job: Job<IStandardDataDto, void, string>, error: Error): Promise<void> => {
      if (job?.data?.skipProcessing) {
        return;
      }

      await this.jobHasFailed(job, error);
    });

    this.bullMqWorker.on('completed', async (job: Job<IStandardDataDto, void, string>): Promise<void> => {
      if (job?.data?.skipProcessing) {
        return;
      }

      await this.jobHasCompleted(job);
    });

    this.setSqsCompletedHandler(async (job: Job<IStandardDataDto, void, string>): Promise<void> => {
      await this.jobHasCompleted(job);
    });

    /*
     * Retry behaviour on SQS is driven by the queue, not by per-message
     * code:
     *
     *   - `meta.receiveCount` feeds `job.attemptsMade` via
     *     `createSqsJobAdapter`, so `jobHasFailed` evaluates
     *     `hasReachedMaxAttempts` against the same `DEFAULT_ATTEMPTS`
     *     ceiling used for webhook-filter jobs.
     *   - Returning `retry: true` re-throws and SQS keeps the message.
     *   - Returning `retry: false` acks and SQS deletes the message.
     *   - `RedrivePolicy.maxReceiveCount=3` on the standard SQS queue
     *     caps total deliveries to match the `attempts: 3` ceiling for
     *     webhook-filter jobs. Non-webhook-filter failures hit
     *     `hasToBackoff=false` and ack on the first attempt.
     *
     * `retryDelayMs` restores the per-attempt cadence BullMQ gets from
     * `settings.backoffStrategy`, which never applied on the SQS path.
     */
    this.setSqsFailedHandler(
      async (job: Job<IStandardDataDto, void, string>, error: Error): Promise<ISqsFailureOutcome> => {
        const retry = await this.jobHasFailed(job, error);

        if (!retry) {
          return { retry: false };
        }

        return { retry: true, retryDelayMs: await this.resolveSqsRetryDelay(job, error) };
      }
    );

    this.startSqsConsumer();
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      ...getStandardWorkerOptions(),
      settings: {
        backoffStrategy: this.getBackoffStrategies(),
      },
    };
  }

  private extractMinimalJobData(data: IStandardDataDto): {
    environmentId: string;
    jobId: string;
    organizationId: string;
    userId: string;
  } {
    const { _environmentId: environmentId, _id: jobId, _organizationId: organizationId, _userId: userId } = data;

    if (!environmentId || !jobId || !organizationId || !userId) {
      const message = data.payload?.message;

      if (!message) {
        throw new Error(`Job data is missing required fields: ${JSON.stringify(data)}`);
      }

      return {
        environmentId: message._environmentId,
        jobId: message._jobId,
        organizationId: message._organizationId,
        userId,
      };
    }

    return {
      environmentId,
      jobId,
      organizationId,
      userId,
    };
  }

  private async isKillSwitchEnabled(data: IStandardDataDto): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
      defaultValue: false,
      organization: { _id: data._organizationId },
      environment: { _id: data._environmentId },
      component: 'worker',
    });
  }

  private getWorkerProcessor() {
    return async ({ data }: { data: IStandardDataDto }) => {
      const isKillSwitchEnabled = await this.isKillSwitchEnabled(data);

      if (isKillSwitchEnabled) {
        Logger.log(`Kill switch enabled for organizationId ${data._organizationId}. Skipping job.`, LOG_CONTEXT);

        return;
      }

      if (data.skipProcessing) {
        Logger.log(`Skipping job ${data._id} - skipProcessing flag is set,`, LOG_CONTEXT);

        return;
      }
      const minimalJobData = this.extractMinimalJobData(data);
      const organizationExists = await this.organizationExist(data);

      if (!organizationExists) {
        Logger.verbose(
          `Organization not found for organizationId ${minimalJobData.organizationId}. Skipping job.`,
          LOG_CONTEXT
        );

        return;
      }

      Logger.verbose(`Job ${minimalJobData.jobId} is being processed in the new instance standard worker`, LOG_CONTEXT);

      return await new Promise((resolve, reject) => {
        const _this = this;

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.JOB_PROCESSING_QUEUE,
          'Trigger Engine',
          function processTask() {
            const transaction = nr.getTransaction();

            storage.run(new Store(PinoLogger.root), () => {
              _this.runJob
                .execute(RunJobCommand.create(minimalJobData))
                .then(resolve)
                .catch((error) => {
                  Logger.error(
                    error,
                    `Failed to run the job ${minimalJobData.jobId} during worker processing`,
                    LOG_CONTEXT
                  );

                  if (isWebhookFilterSsrfBlockedError(error)) {
                    return reject(new UnrecoverableError((error as Error).message));
                  }

                  return reject(error);
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

  private async jobHasCompleted(job: Job<IStandardDataDto, void, string>): Promise<void> {
    let jobId;

    try {
      const minimalData = this.extractMinimalJobData(job.data);
      jobId = minimalData.jobId;

      /*
       * The job might have been cancelled in the pipeline (e.g., by a digest or delay step)
       * In such cases, we only update jobs that are in RUNNING status to COMPLETED, preserving other final statuses
       */
      await this.jobRepository.updateOne(
        {
          _environmentId: minimalData.environmentId,
          _id: minimalData.jobId,
          status: JobStatusEnum.RUNNING,
        },
        {
          $set: {
            status: JobStatusEnum.COMPLETED,
          },
        }
      );
    } catch (error) {
      Logger.error(error, `Failed to set job ${jobId} as completed`, LOG_CONTEXT);
    }
  }

  private async jobHasFailed(job: Job<IStandardDataDto, void, string>, error: Error): Promise<boolean> {
    let jobId;
    let hasToBackoff = false;

    nr.noticeError(error);

    try {
      const minimalData = this.extractMinimalJobData(job.data);
      jobId = minimalData.jobId;

      hasToBackoff = this.runJob.shouldBackoff(error);
      const hasReachedMaxAttempts = job.attemptsMade >= this.DEFAULT_ATTEMPTS;
      const shouldHandleLastFailedJob = hasToBackoff && hasReachedMaxAttempts;

      const shouldBeSetAsFailed = !hasToBackoff || shouldHandleLastFailedJob;
      if (shouldBeSetAsFailed) {
        let isLastJobInWorkflow = false;

        const jobEntity = await this.jobRepository.findOne({
          _id: minimalData.jobId,
          _environmentId: minimalData.environmentId,
        });

        if (jobEntity) {
          const hasNextJob = await this.jobRepository.findOne({
            _environmentId: minimalData.environmentId,
            _parentId: minimalData.jobId,
          });

          const shouldHaltOnFailure =
            jobEntity.step?.shouldStopOnFail === undefined ? true : jobEntity.step.shouldStopOnFail;

          isLastJobInWorkflow = !hasNextJob || shouldHaltOnFailure;
        }

        await this.setJobAsFailed.execute(
          SetJobAsFailedCommand.create({ ...minimalData, isLastJobFailed: isLastJobInWorkflow }),
          error
        );
      }

      if (shouldHandleLastFailedJob) {
        await this.handleLastFailedJob.execute(
          HandleLastFailedJobCommand.create({
            ...minimalData,
            error,
          })
        );
      }

      return hasToBackoff && !hasReachedMaxAttempts;
    } catch (anotherError) {
      Logger.error(anotherError, `Failed to set job ${jobId} as failed`, LOG_CONTEXT);

      return hasToBackoff && job.attemptsMade < this.DEFAULT_ATTEMPTS;
    }
  }

  /**
   * Resolves the delay before the next attempt, and as a side effect writes the
   * `WEBHOOK_FILTER_FAILED_RETRY` execution detail into the activity feed.
   */
  private async executeBackoffStrategy(attemptsMade: number, eventError: Error, eventJob: Job): Promise<number> {
    return await this.webhookFilterBackoffStrategy.execute({
      attemptsMade,
      environmentId: eventJob?.data?._environmentId,
      eventError,
      eventJob,
      organizationId: eventJob?.data?._organizationId,
      userId: eventJob?.data?._userId,
    });
  }

  private getBackoffStrategies = () => {
    return async (attemptsMade: number, type: string, eventError: Error, eventJob: Job): Promise<number> => {
      return await this.executeBackoffStrategy(attemptsMade, eventError, eventJob);
    };
  };

  /**
   * The SQS counterpart to `settings.backoffStrategy`, which BullMQ invokes
   * between retries but which never ran on the SQS path.
   *
   * Only reached when `jobHasFailed` returned true, and that requires
   * `shouldBackoff` - i.e. a retryable webhook filter error - so this matches
   * BullMQ, where `options.backoff` is set only for webhook-filter steps.
   */
  private async resolveSqsRetryDelay(job: Job, error: Error): Promise<number | undefined> {
    try {
      return await this.executeBackoffStrategy(job.attemptsMade, error, job);
    } catch (backoffError) {
      Logger.error(
        backoffError,
        `Failed to resolve the SQS retry delay for job ${job.data?._id}, falling back to the visibility timeout`,
        LOG_CONTEXT
      );

      // Undefined, not 0: 0 would mean "retry immediately".
      return undefined;
    }
  }

  private async organizationExist(data: IStandardDataDto): Promise<boolean> {
    const { _organizationId } = data;
    const organization = await this.organizationRepository.findOne({ _id: _organizationId });

    return !!organization;
  }
}
