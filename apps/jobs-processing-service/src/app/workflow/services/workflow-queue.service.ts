import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { QueueService, PinoLogger, storage, Store } from '@novu/application-generic';

import {
  RunJob,
  RunJobCommand,
  QueueNextJob,
  QueueNextJobCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  SetJobAsCommand,
  SetJobAsCompleted,
  SetJobAsFailed,
  SetJobAsFailedCommand,
} from '../usecases';

interface IJobData {
  _id: string;
  _environmentId: string;
  _organizationId: string;
  _userId: string;
}

@Injectable()
export class WorkflowQueueService extends QueueService<IJobData> {
  constructor(
    @Inject(forwardRef(() => QueueNextJob)) private queueNextJob: QueueNextJob,
    @Inject(forwardRef(() => RunJob)) private runJob: RunJob,
    @Inject(forwardRef(() => SetJobAsCompleted)) private setJobAsCompleted: SetJobAsCompleted,
    @Inject(forwardRef(() => SetJobAsFailed)) private setJobAsFailed: SetJobAsFailed,
    @Inject(forwardRef(() => CreateExecutionDetails)) private createExecutionDetails: CreateExecutionDetails
  ) {
    super();
    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());

    this.bullMqService.worker.on('completed', async (job) => {
      await this.jobHasCompleted(job);
    });

    this.bullMqService.worker.on('failed', async (job, error) => {
      await this.jobHasFailed(job, error);
    });
  }

  public async gracefulShutdown() {
    // Right now we only want this for testing purposes
    if (process.env.NODE_ENV === 'test') {
      await this.bullMqService.queue.drain();
      await this.bullMqService.worker.close();
    }
  }

  private getWorkerOpts() {
    return {
      ...this.bullConfig,
      lockDuration: 90000,
      concurrency: 200,
      settings: {
        backoffStrategies: this.getBackoffStrategies(),
      },
    };
  }

  private getWorkerProcessor() {
    return async ({ data }: { data: IJobData }) => {
      return await new Promise(async (resolve, reject) => {
        storage.run(new Store(PinoLogger.root), () => {
          this.runJob
            .execute(
              RunJobCommand.create({
                jobId: data._id,
                environmentId: data._environmentId,
                organizationId: data._organizationId,
                userId: data._userId,
              })
            )
            .then(resolve)
            .catch(reject);
        });
      });
    };
  }

  private async jobHasCompleted(job): Promise<void> {
    await this.setJobAsCompleted.execute(
      SetJobAsCommand.create({
        environmentId: job.data._environmentId,
        _jobId: job.data._id,
        organizationId: job.data._organizationId,
      })
    );
  }

  private async jobHasFailed(job, error): Promise<void> {
    const hasToBackoff = this.runJob.shouldBackoff(error);

    if (!hasToBackoff) {
      await this.setJobAsFailed.execute(
        SetJobAsFailedCommand.create({
          environmentId: job.data._environmentId,
          error,
          _jobId: job.data._id,
          organizationId: job.data._organizationId,
        })
      );
    }

    const lastWebhookFilterRetry = job.attemptsMade === this.DEFAULT_ATTEMPTS && hasToBackoff;

    if (lastWebhookFilterRetry) {
      await this.handleLastFailedWebhookFilter(job, error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleLastFailedWebhookFilter(job: any, error: Error) {
    await this.setJobAsFailed.execute(
      SetJobAsFailedCommand.create({
        environmentId: job.data._environmentId,
        error,
        _jobId: job.data._id,
        organizationId: job.data._organizationId,
      })
    );

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job.data),
        detail: DetailEnum.WEBHOOK_FILTER_FAILED_LAST_RETRY,
        source: ExecutionDetailsSourceEnum.WEBHOOK,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: true,
        raw: JSON.stringify({ message: JSON.parse(error.message).message }),
      })
    );

    if (!job?.data?.step?.shouldStopOnFail) {
      await this.queueNextJob.execute(
        QueueNextJobCommand.create({
          parentId: job?.data._id,
          environmentId: job?.data._environmentId,
          organizationId: job?.data._organizationId,
          userId: job?.data._userId,
        })
      );
    }
  }

  private getBackoffStrategies = () => {
    return {
      webhookFilterBackoff: async (attemptsMade, err, job) => {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(job.data),
            detail: DetailEnum.WEBHOOK_FILTER_FAILED_RETRY,
            source: ExecutionDetailsSourceEnum.WEBHOOK,
            status: ExecutionDetailsStatusEnum.PENDING,
            isTest: false,
            isRetry: true,
            raw: JSON.stringify({ message: JSON.parse(err.message).message, attempt: attemptsMade }),
          })
        );

        return Math.round(Math.random() * Math.pow(2, attemptsMade) * 1000);
      },
    };
  };
}
