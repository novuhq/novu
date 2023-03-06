import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobsOptions, Queue, QueueBaseOptions, QueueScheduler, Worker } from 'bullmq';
// TODO: Remove this DAL dependency, maybe through a DTO or shared entity
import { JobEntity } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';

import { RunJob, RunJobCommand } from '../../usecases/run-job';
import { QueueNextJob, QueueNextJobCommand } from '../../usecases/queue-next-job';
import {
  SetJobAsCommand,
  SetJobAsCompleted,
  SetJobAsFailed,
  SetJobAsFailedCommand,
} from '../../usecases/update-job-status';

import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '../../../execution-details/usecases/create-execution-details';
import { DetailEnum } from '../../../execution-details/types';

export const WORKER_NAME = 'standard';

@Injectable()
export class WorkflowQueueService {
  private bullConfig: QueueBaseOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX),
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
      keyPrefix: getRedisPrefix(),
      tls: process.env.REDIS_TLS as ConnectionOptions,
    },
  };
  public readonly queue: Queue;
  public readonly worker: Worker;
  private readonly queueScheduler: QueueScheduler;
  readonly DEFAULT_ATTEMPTS = 3;

  constructor(
    @Inject(forwardRef(() => QueueNextJob)) private queueNextJob: QueueNextJob,
    @Inject(forwardRef(() => RunJob)) private runJob: RunJob,
    @Inject(forwardRef(() => SetJobAsCompleted)) private setJobAsCompleted: SetJobAsCompleted,
    @Inject(forwardRef(() => SetJobAsFailed)) private setJobAsFailed: SetJobAsFailed,
    @Inject(forwardRef(() => CreateExecutionDetails)) private createExecutionDetails: CreateExecutionDetails
  ) {
    this.queue = new Queue(WORKER_NAME, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    this.worker = new Worker(WORKER_NAME, this.getWorkerProcessor(), this.getWorkerOpts());

    this.worker.on('completed', async (job) => {
      await this.jobHasCompleted(job);
    });

    this.worker.on('failed', async (job, error) => {
      await this.jobHasFailed(job, error);
    });

    this.queueScheduler = new QueueScheduler(WORKER_NAME, this.bullConfig);
  }

  public async gracefulShutdown() {
    // Right now we only want this for testing purposes
    if (process.env.NODE_ENV === 'test') {
      await this.queue.drain();
      await this.worker.close();
    }
  }

  private getWorkerOpts() {
    return {
      ...this.bullConfig,
      lockDuration: 90000,
      concurrency: 50,
      settings: {
        backoffStrategies: this.getBackoffStrategies(),
      },
    };
  }

  private getWorkerProcessor() {
    return async ({ data }: { data: JobEntity }) => {
      return await this.runJob.execute(
        RunJobCommand.create({
          jobId: data._id,
          environmentId: data._environmentId,
          organizationId: data._organizationId,
          userId: data._userId,
        })
      );
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

  public async addToQueue(id: string, data: JobEntity, delay?: number | undefined) {
    const options: JobsOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      delay,
    };

    const stepContainsWebhookFilter = this.stepContainsFilter(data, 'webhook');

    if (stepContainsWebhookFilter) {
      options.backoff = {
        type: 'webhookFilterBackoff',
      };
      options.attempts = this.DEFAULT_ATTEMPTS;
    }

    await this.queue.add(id, data, options);
  }

  private stepContainsFilter(data: JobEntity, onFilter: string) {
    return data.step.filters?.some((filter) => {
      return filter.children?.some((child) => {
        return child.on === onFilter;
      });
    });
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
