import { Inject, Injectable } from '@nestjs/common';
import { Queue, Worker, QueueBaseOptions, JobsOptions, QueueScheduler } from 'bullmq';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { DigestUnitEnum } from '@novu/shared';
import { RunJob } from '../usecases/run-job/run-job.usecase';
import { RunJobCommand } from '../usecases/run-job/run-job.command';

interface IJobEntityExtended extends JobEntity {
  presend?: boolean;
}

@Injectable()
export class WorkflowQueueService {
  private bullConfig: QueueBaseOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX),
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
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
      async ({ data }: { data: IJobEntityExtended }) => {
        return await this.work(data);
      },
      {
        ...this.bullConfig,
        lockDuration: 90000,
        concurrency: 100,
      }
    );
    this.worker.on('completed', async (job) => {
      await this.jobRepository.updateStatus(job.data._id, JobStatusEnum.COMPLETED);
    });
    this.worker.on('failed', async (job, e) => {
      await this.jobRepository.updateStatus(job.data._id, JobStatusEnum.FAILED);
      await this.jobRepository.setError(job.data._id, e);
    });
    this.queueScheduler = new QueueScheduler('standard', this.bullConfig);
  }

  public async work(job: IJobEntityExtended) {
    await this.runJob.execute(
      RunJobCommand.create({
        jobId: job._id,
        presend: job.presend,
        environmentId: job._environmentId,
        organizationId: job._organizationId,
        userId: job._userId,
      })
    );
  }

  public async addToQueue(id: string, data: any, delay?: number | undefined) {
    const options: JobsOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      delay,
    };
    await this.queue.add(id, data, options);
  }

  public static toMilliseconds(amount: number, unit: DigestUnitEnum): number {
    let delay = 1000 * amount;
    if (unit === DigestUnitEnum.DAYS) {
      delay = 60 * 60 * 24 * delay;
    }
    if (unit === DigestUnitEnum.HOURS) {
      delay = 60 * 60 * delay;
    }
    if (unit === DigestUnitEnum.MINUTES) {
      delay = 60 * delay;
    }

    return delay;
  }
}
