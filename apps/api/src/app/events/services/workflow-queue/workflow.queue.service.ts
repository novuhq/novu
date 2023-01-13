import { Inject, Injectable } from '@nestjs/common';
import { JobsOptions, Queue, QueueBaseOptions, QueueScheduler, Worker } from 'bullmq';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { RunJob } from '../../usecases/run-job/run-job.usecase';
import { RunJobCommand } from '../../usecases/run-job/run-job.command';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, getRedisPrefix } from '@novu/shared';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER } from '../../../shared/constants';
import { QueueNextJobCommand } from '../../usecases/queue-next-job/queue-next-job.command';
import { QueueNextJob } from '../../usecases/queue-next-job/queue-next-job.usecase';

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
    },
  };
  public readonly queue: Queue;
  public readonly worker: Worker;
  @Inject()
  private jobRepository: JobRepository;
  @Inject()
  private runJob: RunJob;
  private readonly queueScheduler: QueueScheduler;
  readonly DEFAULT_ATTEMPTS = 3;

  constructor(private createExecutionDetails: CreateExecutionDetails, private queueNextJob: QueueNextJob) {
    this.queue = new Queue('standard', {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    this.worker = new Worker('standard', this.getWorkerProcessor(), this.getWorkerOpts());

    this.worker.on('completed', async (job) => {
      await this.jobRepository.updateStatus(job.data._organizationId, job.data._id, JobStatusEnum.COMPLETED);
    });

    this.worker.on('failed', async (job, e) => {
      if (!shouldBackoff(e)) {
        await this.jobRepository.updateStatus(job.data._organizationId, job.data._id, JobStatusEnum.FAILED);
        await this.jobRepository.setError(job.data._organizationId, job.data._id, e);
      }

      const lastWebhookFilterRetry = job.attemptsMade === this.DEFAULT_ATTEMPTS && shouldBackoff(e);

      if (lastWebhookFilterRetry) {
        await this.handleLastFailedWebhookFilter(job, e);
      }
    });

    this.queueScheduler = new QueueScheduler('standard', this.bullConfig);
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

  public getWorkerProcessor() {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleLastFailedWebhookFilter(job: any, e: Error) {
    await this.jobRepository.updateStatus(job.data._organizationId, job.data._id, JobStatusEnum.FAILED);
    await this.jobRepository.setError(job.data._organizationId, job.data._id, e);

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job.data),
        detail: DetailEnum.WEBHOOK_FILTER_FAILED_LAST_RETRY,
        source: ExecutionDetailsSourceEnum.WEBHOOK,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: true,
        raw: JSON.stringify({ message: JSON.parse(e.message).message }),
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

export function shouldBackoff(err) {
  return err.message.includes(EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER);
}
