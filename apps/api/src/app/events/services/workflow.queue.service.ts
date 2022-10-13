import { Inject, Injectable } from '@nestjs/common';
import { Queue, Worker, QueueBaseOptions, JobsOptions, QueueScheduler } from 'bullmq';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { RunJob } from '../usecases/run-job/run-job.usecase';
import { RunJobCommand } from '../usecases/run-job/run-job.command';
import { getRedisPrefix, StepTypeEnum } from '@novu/shared';
import { differenceInMilliseconds } from 'date-fns';

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
      await this.jobRepository.updateStatus(job.data._id, JobStatusEnum.COMPLETED);
    });
    this.worker.on('failed', async (job, e) => {
      await this.jobRepository.updateStatus(job.data._id, JobStatusEnum.FAILED);
      await this.jobRepository.setError(job.data._id, e);
    });
    this.queueScheduler = new QueueScheduler('standard', this.bullConfig);
  }

  public async addToQueue(id: string, data: JobEntity, delay?: number | undefined) {
    let updatedDelay = delay;
    const options: JobsOptions = {
      removeOnComplete: true,
      removeOnFail: true,
    };
    if (data.type === StepTypeEnum.DELAY) {
      updatedDelay = await this.calcDelay(data, delay);
    }

    await this.queue.add(id, data, { delay: updatedDelay, ...options });
  }

  private async calcDelay(data: JobEntity, delay?: number | undefined) {
    const delayedJobsInQueue = await this.queue.getDelayed();
    if (delayedJobsInQueue.length) {
      const delayedJobs = await this.jobRepository.find(
        {
          status: JobStatusEnum.DELAYED,
          type: StepTypeEnum.DELAY,
          _subscriberId: data._subscriberId,
          _templateId: data._templateId,
          _environmentId: data._environmentId,
        },
        '_id'
      );
      const delayedJobsIds = delayedJobs.map((job) => job._id);
      const calcDelayDiffs = delayedJobsInQueue
        .filter((delayed) => delayedJobsIds.includes(delayed.data._id))
        .map((delayed) => {
          return delayed.opts.delay - differenceInMilliseconds(new Date(), new Date(delayed.data.updatedAt));
        });

      if (calcDelayDiffs?.length) {
        for (const remainedDelay of calcDelayDiffs) {
          if (Math.abs(remainedDelay - delay) < 1000) {
            return delay + 1000;
          }
        }
      }
    }

    return delay;
  }
}
