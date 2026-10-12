import { Injectable, Logger } from '@nestjs/common';
import { IEventJobData, IJobData, JobTopicNameEnum } from '@novu/shared';
import {
  BulkJobOptions,
  Job,
  JobsOptions,
  Metrics,
  MetricsTime,
  Processor,
  Queue,
  QueueBaseOptions,
  QueueOptions,
  ConnectionOptions as RedisConnectionOptions,
  UnrecoverableError,
  Worker,
  WorkerOptions,
} from 'bullmq';

import { WorkflowInMemoryProviderService } from '../in-memory-provider';

interface IQueueMetrics {
  completed: Metrics;
  failed: Metrics;
}

type BullMqJobData = undefined | IJobData | IEventJobData;

const LOG_CONTEXT = 'BullMqService';

export {
  Job,
  JobsOptions,
  Processor,
  Queue,
  QueueBaseOptions,
  QueueOptions,
  RedisConnectionOptions as BullMqConnectionOptions,
  Worker,
  WorkerOptions,
  BulkJobOptions,
  UnrecoverableError,
};

export class BullMqService {
  private _queue: Queue;
  private _worker: Worker;

  constructor(private workflowInMemoryProviderService: WorkflowInMemoryProviderService) {}

  public get worker(): Worker {
    return this._worker;
  }

  public get queue(): Queue {
    return this._queue;
  }

  public get queuePrefix(): string {
    return this._queue.opts.prefix;
  }

  public get workerPrefix(): string {
    return this._worker.opts.prefix;
  }

  /**
   * To avoid going crazy not understanding why jobs are not processed in cluster mode
   * Reference:
   * https://github.com/taskforcesh/bullmq/issues/560
   * https://github.com/taskforcesh/bullmq/issues/1219
   *
   * For retro-compatibility instances of the BullMqService must use prefix
   * but in one single case:
   * - Only Redis instances that are not in Cluster mode can't use prefix.
   *
   */
  private generatePrefix(prefix: JobTopicNameEnum): string {
    if (this.workflowInMemoryProviderService.providerInUseIsInClusterMode()) {
      return `{${prefix}}`;
    }

    return undefined;
  }

  /**
   * bullmq resolves its own ioredis copy, so our client's ioredis types are
   * nominally different even though the runtime object is compatible.
   */
  private getConnection(): RedisConnectionOptions {
    return this.workflowInMemoryProviderService.getClient() as RedisConnectionOptions;
  }

  public createQueue(topic: JobTopicNameEnum, queueOptions: QueueOptions) {
    const config = {
      connection: this.getConnection(),
      ...(queueOptions?.defaultJobOptions && {
        defaultJobOptions: {
          ...queueOptions.defaultJobOptions,
        },
      }),
    };

    Logger.log(`Creating queue ${topic}`, LOG_CONTEXT);

    const prefix = this.generatePrefix(topic);
    this._queue = new Queue(topic, {
      ...config,
      ...(prefix && { prefix }),
    });

    return this._queue;
  }

  public createWorker<TData = BullMqJobData>(
    topic: JobTopicNameEnum,
    processor?: string | Processor<TData, unknown, string>,
    workerOptions?: WorkerOptions
  ) {
    const { concurrency, connection, lockDuration, settings } = workerOptions;

    const config = {
      connection: this.getConnection(),
      ...(concurrency && { concurrency }),
      ...(lockDuration && { lockDuration }),
      ...(settings && { settings }),
      metrics: { maxDataPoints: MetricsTime.ONE_MONTH },
    };

    Logger.log(`Creating worker ${topic}`, LOG_CONTEXT);

    const prefix = this.generatePrefix(topic);
    this._worker = new Worker(topic, processor, {
      ...config,
      ...(prefix && { prefix }),
    });

    return this._worker;
  }

  public async add(name: string, data: BullMqJobData, options: JobsOptions = {}): Promise<Job> {
    return this._queue.add(name, data, options);
  }

  public async addBulk(
    data: {
      name: string;
      data: BullMqJobData;
      options?: BulkJobOptions;
    }[]
  ) {
    const jobs = data.map((job) => {
      const jobOptions = {
        removeOnComplete: true,
        removeOnFail: true,
        ...job?.options,
      };

      const jobResult: {
        name: string;
        data: BullMqJobData;
        opts?: BulkJobOptions;
      } = { name: job.name, data: job.data, opts: jobOptions };

      return jobResult;
    });

    await this._queue.addBulk(jobs);
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the BullMQ service down', LOG_CONTEXT);

    if (this._queue) {
      await this._queue.close();
    }
    if (this._worker) {
      await this._worker.close();
    }

    Logger.log('Shutting down the BullMQ service has finished', LOG_CONTEXT);
  }

  public async getStatus(): Promise<{
    queueIsPaused: boolean | undefined;
    queueName: string | undefined;
    workerIsPaused: boolean | undefined;
    workerIsRunning: boolean | undefined;
    workerName: string | undefined;
  }> {
    const [queueIsPaused, workerIsPaused, workerIsRunning] = await Promise.all([
      this.isQueuePaused(),
      this.isWorkerPaused(),
      this.isWorkerRunning(),
    ]);

    return {
      queueIsPaused,
      queueName: this._queue?.name,
      workerIsPaused,
      workerIsRunning,
      workerName: this._worker?.name,
    };
  }

  public isClientReady(): boolean {
    return this.workflowInMemoryProviderService.isReady();
  }

  public async isQueuePaused(): Promise<boolean> {
    return await this._queue?.isPaused();
  }

  public async isWorkerPaused(): Promise<boolean> {
    return await this._worker?.isPaused();
  }

  public async isWorkerRunning(): Promise<boolean> {
    return await this._worker?.isRunning();
  }

  public async pauseWorker(): Promise<void> {
    if (this._worker) {
      try {
        /**
         * We will only execute this in the cold start, therefore we will
         * expect jobs not being processed in the Worker.
         * Reference: https://api.docs.bullmq.io/classes/v4.Worker.html#pause.pause-1
         */
        const doNotWaitActive = true;

        await this._worker.pause(doNotWaitActive);
        Logger.verbose(`Worker ${this._worker.name} pause succeeded`, LOG_CONTEXT);
      } catch (error) {
        Logger.error(error, `Worker ${this._worker.name} pause failed`, LOG_CONTEXT);

        throw error;
      }
    }
  }

  public async resumeWorker(): Promise<void> {
    if (this._worker) {
      try {
        await this._worker.resume();
        Logger.verbose(`Worker ${this._worker.name} resume succeeded`, LOG_CONTEXT);
      } catch (error) {
        Logger.error(error, `Worker ${this._worker.name} resume failed`, LOG_CONTEXT);

        throw error;
      }
    }
  }

  public async waitUntilWorkerIsReady(): Promise<void> {
    if (this._worker) {
      try {
        await this._worker.waitUntilReady();
        Logger.verbose(`Worker ${this._worker.name} is now fully ready`, LOG_CONTEXT);
      } catch (error) {
        Logger.error(error, `Worker ${this._worker.name} waitUntilReady failed`, LOG_CONTEXT);

        throw error;
      }
    }
  }
}
