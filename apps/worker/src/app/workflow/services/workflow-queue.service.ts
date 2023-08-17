const nr = require('newrelic');
import { Job, WorkerOptions } from 'bullmq';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IJobData,
  ObservabilityBackgroundTransactionEnum,
} from '@novu/shared';
import { QueueService, PinoLogger, storage, Store, INovuWorker } from '@novu/application-generic';

import {
  RunJob,
  RunJobCommand,
  SetJobAsCommand,
  SetJobAsCompleted,
  SetJobAsFailed,
  SetJobAsFailedCommand,
  WebhookFilterBackoffStrategy,
  HandleLastFailedJobCommand,
  HandleLastFailedJob,
} from '../usecases';

const LOG_CONTEXT = 'WorkflowQueueService';

@Injectable()
export class WorkflowQueueService extends QueueService<IJobData> implements INovuWorker {
  constructor(
    @Inject(forwardRef(() => HandleLastFailedJob)) private handleLastFailedJob: HandleLastFailedJob,
    @Inject(forwardRef(() => RunJob)) private runJob: RunJob,
    @Inject(forwardRef(() => SetJobAsCompleted)) private setJobAsCompleted: SetJobAsCompleted,
    @Inject(forwardRef(() => SetJobAsFailed)) private setJobAsFailed: SetJobAsFailed,
    @Inject(forwardRef(() => WebhookFilterBackoffStrategy))
    private webhookFilterBackoffStrategy: WebhookFilterBackoffStrategy
  ) {
    super();
    Logger.warn('Workflow queue service created');
    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOptions());

    this.bullMqService.worker.on('completed', async (job: Job<IJobData, void, string>): Promise<void> => {
      await this.jobHasCompleted(job);
    });

    this.bullMqService.worker.on('failed', async (job: Job<IJobData, void, string>, error: Error): Promise<void> => {
      await this.jobHasFailed(job, error);
    });
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: 90000,
      concurrency: 200,
      settings: {
        backoffStrategy: this.getBackoffStrategies(),
      },
    };
  }

  private getWorkerProcessor() {
    return async ({ data }: { data: IJobData }) => {
      const { _environmentId: environmentId, _id: jobId, _organizationId: organizationId, _userId: userId } = data;

      return await new Promise(async (resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.JOB_PROCESSING_QUEUE,
          'Trigger Engine',
          function () {
            const transaction = nr.getTransaction();

            storage.run(new Store(PinoLogger.root), () => {
              _this.runJob
                .execute(
                  RunJobCommand.create({
                    environmentId,
                    jobId,
                    organizationId,
                    userId,
                  })
                )

                .then(resolve)
                .catch((error) => {
                  Logger.error(`Failed to run the job ${jobId} during worker processing`, error, LOG_CONTEXT);

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

  private async jobHasCompleted(job: Job<IJobData, void, string>): Promise<void> {
    let jobId;

    try {
      jobId = job.data._id;
      const environmentId = job.data._environmentId;
      const userId = job.data._userId;

      await this.setJobAsCompleted.execute(
        SetJobAsCommand.create({
          environmentId,
          jobId,
          userId,
        })
      );
    } catch (error) {
      Logger.error(`Failed to set job ${jobId} as completed`, error, LOG_CONTEXT);
    }
  }

  private async jobHasFailed(job: Job<IJobData, void, string>, error: Error): Promise<void> {
    let jobId;

    try {
      jobId = job.data._id;
      const environmentId = job.data._environmentId;
      const organizationId = job.data._organizationId;
      const userId = job.data._userId;

      const hasToBackoff = this.runJob.shouldBackoff(error);
      const hasReachedMaxAttempts = job.attemptsMade >= this.DEFAULT_ATTEMPTS;
      const shouldHandleLastFailedJob = hasToBackoff && hasReachedMaxAttempts;

      const shouldBeSetAsFailed = !hasToBackoff || shouldHandleLastFailedJob;
      if (shouldBeSetAsFailed) {
        await this.setJobAsFailed.execute(
          SetJobAsFailedCommand.create({
            environmentId,
            jobId,
            organizationId,
            userId,
          }),
          error
        );
      }

      if (shouldHandleLastFailedJob) {
        const handleLastFailedJobCommand = HandleLastFailedJobCommand.create({
          environmentId,
          error,
          jobId,
          organizationId,
          userId,
        });

        await this.handleLastFailedJob.execute(handleLastFailedJobCommand);
      }
    } catch (anotherError) {
      Logger.error(`Failed to set job ${jobId} as failed`, anotherError, LOG_CONTEXT);
    }
  }

  private getBackoffStrategies = () => {
    return async (attemptsMade: number, type: string, eventError: Error, eventJob: Job): Promise<number> => {
      const command = {
        attemptsMade,
        environmentId: eventJob?.data?._environmentId,
        eventError,
        eventJob,
        organizationId: eventJob?.data?._organizationId,
        userId: eventJob?.data?._userId,
      };

      return await this.webhookFilterBackoffStrategy.execute(command);
    };
  };

  public async pauseWorker(): Promise<void> {
    Logger.log('Pausing worker', LOG_CONTEXT);
    await this.bullMqService.pauseWorker();
  }

  public async resumeWorker(): Promise<void> {
    Logger.log('Resuming worker', LOG_CONTEXT);
    await this.bullMqService.resumeWorker();
  }
}
