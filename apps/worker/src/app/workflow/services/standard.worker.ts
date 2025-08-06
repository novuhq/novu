import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  getStandardWorkerOptions,
  IStandardDataDto,
  Job,
  PinoLogger,
  StandardWorkerService,
  Store,
  storage,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, JobRepository } from '@novu/dal';
import { JobStatusEnum, ObservabilityBackgroundTransactionEnum } from '@novu/shared';
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
    private jobRepository: JobRepository
  ) {
    super(new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());

    this.worker.on('failed', async (job: Job<IStandardDataDto, void, string>, error: Error): Promise<void> => {
      await this.jobHasFailed(job, error);
    });

    this.worker.on('completed', async (job: Job<IStandardDataDto, void, string>): Promise<void> => {
      await this.jobHasCompleted(job);
    });
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
        throw new Error(`Job data is missing required fields${JSON.stringify(data)}`);
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

  private getWorkerProcessor() {
    return async ({ data }: { data: IStandardDataDto }) => {
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

  private async jobHasFailed(job: Job<IStandardDataDto, void, string>, error: Error): Promise<void> {
    let jobId;

    nr.noticeError(error);

    try {
      const minimalData = this.extractMinimalJobData(job.data);
      jobId = minimalData.jobId;

      const hasToBackoff = this.runJob.shouldBackoff(error);
      const hasReachedMaxAttempts = job.attemptsMade >= this.DEFAULT_ATTEMPTS;
      const shouldHandleLastFailedJob = hasToBackoff && hasReachedMaxAttempts;

      const shouldBeSetAsFailed = !hasToBackoff || shouldHandleLastFailedJob;
      if (shouldBeSetAsFailed) {
        await this.setJobAsFailed.execute(SetJobAsFailedCommand.create(minimalData), error);
      }

      if (shouldHandleLastFailedJob) {
        await this.handleLastFailedJob.execute(
          HandleLastFailedJobCommand.create({
            ...minimalData,
            error,
          })
        );
      }
    } catch (anotherError) {
      Logger.error(anotherError, `Failed to set job ${jobId} as failed`, LOG_CONTEXT);
    }
  }

  private getBackoffStrategies = () => {
    return async (attemptsMade: number, type: string, eventError: Error, eventJob: Job): Promise<number> => {
      return await this.webhookFilterBackoffStrategy.execute({
        attemptsMade,
        environmentId: eventJob?.data?._environmentId,
        eventError,
        eventJob,
        organizationId: eventJob?.data?._organizationId,
        userId: eventJob?.data?._userId,
      });
    };
  };

  private async organizationExist(data: IStandardDataDto): Promise<boolean> {
    const { _organizationId } = data;

    const organization = await this.organizationRepository.findOne({ _id: _organizationId });

    return !!organization;
  }
}
