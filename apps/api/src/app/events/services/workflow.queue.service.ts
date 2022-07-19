import { Inject, Injectable } from '@nestjs/common';
import { Queue, Worker, QueueBaseOptions, JobsOptions, QueueScheduler } from 'bullmq';
import { SendMessage } from '../usecases/send-message/send-message.usecase';
import { SendMessageCommand } from '../usecases/send-message/send-message.command';
import { QueueNextJob } from '../usecases/queue-next-job/queue-next-job.usecase';
import { QueueNextJobCommand } from '../usecases/queue-next-job/queue-next-job.command';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { ChannelTypeEnum, DigestTypeEnum, DigestUnitEnum } from '@novu/shared';

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
  private sendMessage: SendMessage;
  @Inject()
  private queueNextJob: QueueNextJob;
  @Inject()
  private jobRepository: JobRepository;
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
        concurrency: 5000,
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
    const canceled = await this.digestIsCanceled(job);
    if (canceled) {
      return;
    }

    await this.jobRepository.updateStatus(job._id, JobStatusEnum.RUNNING);

    await this.sendMessage.execute(
      SendMessageCommand.create({
        identifier: job.identifier,
        payload: job.payload ? job.payload : {},
        step: job.step,
        transactionId: job.transactionId,
        notificationId: job._notificationId,
        environmentId: job._environmentId,
        organizationId: job._organizationId,
        userId: job._userId,
        subscriberId: job._subscriberId,
        jobId: job._id,
        events: job.digest.events,
      })
    );
    if (job.presend === true) {
      return;
    }
    await this.queueNextJob.execute(
      QueueNextJobCommand.create({
        parentId: job._id,
        environmentId: job._environmentId,
        organizationId: job._organizationId,
        userId: job._userId,
      })
    );
  }

  public async addJob(data: JobEntity | undefined, presend = false) {
    if (!data) {
      return;
    }
    const options: JobsOptions = {
      removeOnComplete: true,
      removeOnFail: true,
    };

    const digestAdded = await this.addDigestJob(data, options);
    if (digestAdded) {
      return;
    }
    await this.jobRepository.updateStatus(data._id, JobStatusEnum.QUEUED);
    await this.queue.add(
      data._id,
      {
        ...data,
        presend,
      },
      options
    );
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

  private async addDigestJob(data, options: JobsOptions): Promise<boolean> {
    const isDigest = data.type === ChannelTypeEnum.DIGEST && data.digest.amount && data.digest.unit;
    if (!isDigest) {
      return false;
    }

    await this.jobRepository.updateStatus(data._id, JobStatusEnum.DELAYED);
    const delay = WorkflowQueueService.toMilliseconds(data.digest.amount, data.digest.unit);
    if (data.digest?.updateMode) {
      const inApps = await this.jobRepository.findInAppsForDigest(data.transactionId, data._subscriberId);
      for (const inApp of inApps) {
        await this.addJob(inApp, true);
      }
    }
    await this.queue.add(data._id, data, { delay, ...options });

    return true;
  }

  private async digestIsCanceled(job: JobEntity) {
    if (job.type !== ChannelTypeEnum.DIGEST) {
      return false;
    }
    const count = await this.jobRepository.count({
      _id: job._id,
      status: JobStatusEnum.CANCELED,
    });

    return count > 0;
  }
}
