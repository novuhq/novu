import { Inject, Injectable } from '@nestjs/common';
import { Queue, Worker, QueueBaseOptions, JobsOptions, QueueScheduler } from 'bullmq';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { RunJob } from '../usecases/run-job/run-job.usecase';
import { RunJobCommand } from '../usecases/run-job/run-job.command';
import { getRedisPrefix } from '@novu/shared';

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

  constructor() {
    this.queue = new Queue('standard', {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
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
      }
    );
    this.worker.on('completed', async (job) => {
      await this.jobRepository.updateStatus(job.data._organizationId, job.data._id, JobStatusEnum.COMPLETED);
    });
    this.worker.on('failed', async (job, e) => {
      await this.jobRepository.updateStatus(job.data._organizationId, job.data._id, JobStatusEnum.FAILED);
      await this.jobRepository.setError(job.data._organizationId, job.data._id, e);
    });
    this.queueScheduler = new QueueScheduler('standard', this.bullConfig);
  }

  public async addToQueue(id: string, data: JobEntity, delay?: number | undefined) {
    const options: JobsOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      delay,
    };

    await this.queue.add(id, data, options);
  }
}
