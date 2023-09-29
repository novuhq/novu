const nr = require('newrelic');
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IJobData,
  ObservabilityBackgroundTransactionEnum,
} from '@novu/shared';
import {
  INovuWorker,
  Job,
  PinoLogger,
  StandardWorkerService,
  storage,
  Store,
  WorkerOptions,
} from '@novu/application-generic';

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

const LOG_CONTEXT = 'StandardWorker';

@Injectable()
export class StandardWorker extends StandardWorkerService implements INovuWorker {
  constructor(
    private handleLastFailedJob: HandleLastFailedJob,
    private runJob: RunJob,
    @Inject(forwardRef(() => SetJobAsCompleted)) private setJobAsCompleted: SetJobAsCompleted,
    @Inject(forwardRef(() => SetJobAsFailed)) private setJobAsFailed: SetJobAsFailed,
    @Inject(forwardRef(() => WebhookFilterBackoffStrategy))
    private webhookFilterBackoffStrategy: WebhookFilterBackoffStrategy
  ) {
    super();

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());

    this.worker.on('completed', async (job: Job<IJobData, void, string>): Promise<void> => {
      await this.jobHasCompleted(job);
    });

    this.worker.on('failed', async (job: Job<IJobData, void, string>, error: Error): Promise<void> => {
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

  private extractMinimalJobData(job: any): {
    environmentId: string;
    organizationId: string;
    jobId: string;
    userId: string;
  } {
    const { _environmentId: environmentId, _id: jobId, _organizationId: organizationId, _userId: userId } = job;

    if (!environmentId || !jobId || !organizationId || !userId) {
      const message = job.payload.message;

      return {
        environmentId: message._environmentId,
        jobId: message._jobId,
        organizationId: message._organizationId,
        userId: job.userId,
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
    return async ({ data }: { data: IJobData | any }) => {
      const minimalJobData = this.extractMinimalJobData(data);

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

  private async jobHasCompleted(job: Job<IJobData, void, string>): Promise<void> {
    let jobId;

    try {
      const minimalData = this.extractMinimalJobData(job.data);
      jobId = minimalData.jobId;
      const environmentId = minimalData.environmentId;
      const userId = minimalData.userId;

      await this.setJobAsCompleted.execute(
        SetJobAsCommand.create({
          environmentId,
          jobId,
          userId,
        })
      );
    } catch (error) {
      Logger.error(error, `Failed to set job ${jobId} as completed`, LOG_CONTEXT);
    }
  }

  private async jobHasFailed(job: Job<IJobData, void, string>, error: Error): Promise<void> {
    let jobId;

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
        const handleLastFailedJobCommand = HandleLastFailedJobCommand.create({
          ...minimalData,
          error,
        });

        await this.handleLastFailedJob.execute(handleLastFailedJobCommand);
      }
    } catch (anotherError) {
      Logger.error(anotherError, `Failed to set job ${jobId} as failed`, LOG_CONTEXT);
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
}
