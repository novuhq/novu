import { JobsOptions, Queue, QueueBaseOptions, QueueScheduler, Worker } from 'bullmq';
import { getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';
import { JobEntity, JobStatusEnum } from '@novu/dal';

export type MinimalJob = Pick<JobEntity, '_id' | '_environmentId' | '_organizationId' | 'type' | 'delay' | '_userId'>;

export class WorkflowQueue {
  public readonly WEBHOOK_FILTER_BACKOFF = 'webhookFilterBackoff';

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
  private readonly queue: Queue;
  private readonly worker: Worker;
  private readonly queueScheduler: QueueScheduler;
  readonly DEFAULT_ATTEMPTS = 3;

  constructor(workerProcessor, onCompleted, onFailed) {
    this.queue = new Queue('standard', {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    const workerOptions = {
      ...this.bullConfig,
      lockDuration: 90000,
      concurrency: 500,
      settings: {
        backoffStrategies: this.backoffStrategies,
      },
    };

    this.worker = new Worker<MinimalJob, JobStatusEnum>('standard', workerProcessor, workerOptions);
    this.worker.on('completed', onCompleted);
    this.worker.on('failed', onFailed);
    this.queueScheduler = new QueueScheduler('standard', this.bullConfig);
  }
  backoffStrategies = {
    [this.WEBHOOK_FILTER_BACKOFF]: async (attemptsMade) => Math.round(Math.random() * Math.pow(2, attemptsMade) * 1000),
  };

  public async addToQueue(name: string, data: MinimalJob, backoffType: string | undefined) {
    const options: JobsOptions = { jobId: data._id, delay: data.delay };
    if (backoffType) {
      options.backoff = { type: backoffType };
      options.attempts = this.DEFAULT_ATTEMPTS;
    }
    await this.queue.add(name, data, options);
  }

  public async getJob(id: string) {
    return await this.queue.getJob(id);
  }
  public async removeJob(id: string) {
    const queueJob = await this.getJob(id);
    if (queueJob) await queueJob.remove();
  }
  public async promoteJob(id: string) {
    const queueJob = await this.getJob(id);
    if (queueJob) {
      await queueJob.promote();
    }
  }
}
