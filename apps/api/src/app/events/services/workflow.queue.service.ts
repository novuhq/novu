import { Inject, Injectable } from '@nestjs/common';
import { Queue, Worker, QueueBaseOptions, JobsOptions, QueueScheduler } from 'bullmq';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { RunJob } from '../usecases/run-job/run-job.usecase';
import { RunJobCommand } from '../usecases/run-job/run-job.command';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, getRedisPrefix } from '@novu/shared';
import { CreateExecutionDetails } from '../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER } from '../../shared/constants';
import { QueueNextJobCommand } from '../usecases/queue-next-job/queue-next-job.command';
import { QueueNextJob } from '../usecases/queue-next-job/queue-next-job.usecase';

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
        attempts: this.DEFAULT_ATTEMPTS,
      },
    });
    this.worker = new Worker(
      'standard',
      async ({ data }: { data: JobEntity }) => {
        return await this.runJob.execute(
          RunJobCommand.create({
            jobId: data._id,
            environmentId: data._environmentId,
            organizationId: data._organizationId,
            userId: data._userId,
          })
        );
      },
      {
        ...this.bullConfig,
        lockDuration: 90000,
        concurrency: 100,
        settings: {
          backoffStrategies: getBackoffStrategies(this.createExecutionDetails),
        },
      }
    );
    this.worker.on('completed', async (job) => {
      await this.jobRepository.updateStatus(job.data._organizationId, job.data._id, JobStatusEnum.COMPLETED);
    });
    this.worker.on('failed', async (job, e) => {
      await this.jobRepository.updateStatus(job.data._organizationId, job.data._id, JobStatusEnum.FAILED);
      await this.jobRepository.setError(job.data._organizationId, job.data._id, e);

      const lastWebhookFilterRetry =
        job.attemptsMade === this.DEFAULT_ATTEMPTS && e.message.includes(EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER);

      if (lastWebhookFilterRetry) {
        await this.handleLastFailedWebhookFilter(job, e);
      }
    });

    this.queueScheduler = new QueueScheduler('standard', this.bullConfig);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleLastFailedWebhookFilter(job: any, e: Error) {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job.data),
        detail: DetailEnum.WEBHOOK_FILTER_FAILED,
        source: ExecutionDetailsSourceEnum.WEBHOOK,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
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
      backoff: {
        type: 'webhookFilterBackoff',
      },
    };

    await this.queue.add(id, data, options);
  }
}

const getBackoffStrategies = (createExecutionDetails) => {
  return {
    webhookFilterBackoff: async (attemptsMade, err, job) => {
      if (!shouldBackoff(err)) {
        return -1;
      }

      await createExecutionDetails.execute(
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

function shouldBackoff(err) {
  return err.message.includes(EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER);
}
