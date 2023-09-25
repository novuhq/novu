import {
  ConnectionOptions as RedisConnectionOptions,
  Job,
  JobsOptions,
  Metrics,
  MetricsTime,
  Processor,
  Queue,
  QueueBaseOptions,
  QueueOptions,
  Worker,
  WorkerOptions,
} from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  getRedisPrefix,
  IEventJobData,
  IJobData,
  JobTopicNameEnum,
} from '@novu/shared';

import {
  InMemoryProviderEnum,
  InMemoryProviderService,
} from '../in-memory-provider';
import { IRedisProviderConfig } from '../in-memory-provider/providers/redis-provider';

interface IQueueMetrics {
  completed: Metrics;
  failed: Metrics;
}

type BullMqJobData = undefined | IJobData | IEventJobData;

const LOG_CONTEXT = 'OldInstanceBullMqService';
/**
 * TODO: Temporary to migrate to MemoryDB
 */
@Injectable()
export class OldInstanceBullMqService {
  private _queue: Queue;
  private _worker: Worker;
  private inMemoryProviderService: InMemoryProviderService;
  public enabled: boolean;

  public static readonly pro: boolean =
    process.env.NOVU_MANAGED_SERVICE !== undefined;

  constructor() {
    if (this.shouldInstantiate()) {
      this.inMemoryProviderService = new InMemoryProviderService(
        InMemoryProviderEnum.OLD_INSTANCE_REDIS
      );
      this.enabled = true;
    } else {
      this.enabled = false;
    }
  }

  private shouldInstantiate(): boolean {
    const shouldInstantiate =
      !process.env.IS_DOCKER_HOSTED &&
      !!process.env.MEMORY_DB_CLUSTER_SERVICE_HOST;

    Logger.warn(
      { shouldInstantiate },
      `OldInstanceBullMqService should ${
        shouldInstantiate ? '' : 'not'
      } be instantiated`,
      LOG_CONTEXT
    );

    return shouldInstantiate;
  }

  public async initialize() {
    if (this.enabled) {
      await this.inMemoryProviderService.delayUntilReadiness();
    }
  }

  public get worker(): Worker {
    return this._worker;
  }

  public get queue(): Queue {
    return this._queue;
  }

  public get queuePrefix(): string {
    return this._queue?.opts?.prefix;
  }

  public get workerPrefix(): string {
    return this._worker?.opts?.prefix;
  }

  public static haveProInstalled(): boolean {
    if (!OldInstanceBullMqService.pro) {
      return false;
    }

    require('@taskforcesh/bullmq-pro');

    return true;
  }

  private runningWithProQueue(): boolean {
    return (
      OldInstanceBullMqService.pro &&
      OldInstanceBullMqService.haveProInstalled()
    );
  }

  public async getQueueMetrics(): Promise<IQueueMetrics> {
    if (this.enabled) {
      return {
        completed: await this._queue?.getMetrics('completed'),
        failed: await this._queue?.getMetrics('failed'),
      };
    } else {
      return {
        completed: undefined,
        failed: undefined,
      };
    }
  }

  public createQueue(topic: JobTopicNameEnum, queueOptions: QueueOptions) {
    if (this.enabled) {
      const config = {
        connection: this.inMemoryProviderService.inMemoryProviderClient,
        ...(queueOptions?.defaultJobOptions && {
          defaultJobOptions: {
            ...queueOptions.defaultJobOptions,
          },
        }),
      };

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const QueueClass = !OldInstanceBullMqService.pro
        ? Queue
        : require('@taskforcesh/bullmq-pro').QueuePro;

      Logger.log(
        `Creating queue ${topic} for old instance. BullMQ pro is ${
          this.runningWithProQueue() ? 'Enabled' : 'Disabled'
        }`,
        LOG_CONTEXT
      );

      this._queue = new QueueClass(topic, {
        ...config,
      });
    }

    return this._queue;
  }

  public createWorker(
    topic: JobTopicNameEnum,
    processor?: string | Processor<any, unknown | void, string>,
    workerOptions?: WorkerOptions
  ) {
    if (this.enabled) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const WorkerClass = !OldInstanceBullMqService.pro
        ? Worker
        : require('@taskforcesh/bullmq-pro').WorkerPro;

      const { concurrency, connection, lockDuration, settings } = workerOptions;

      const config = {
        connection: this.inMemoryProviderService.inMemoryProviderClient,
        ...(concurrency && { concurrency }),
        ...(lockDuration && { lockDuration }),
        ...(settings && { settings }),
        metrics: { maxDataPoints: MetricsTime.ONE_MONTH },
        ...(OldInstanceBullMqService.pro
          ? {
              group: {},
            }
          : {}),
      };

      Logger.log(
        `Creating worker for old instance. BullMQ pro is ${
          this.runningWithProQueue() ? 'Enabled' : 'Disabled'
        }`,
        LOG_CONTEXT
      );

      this._worker = new WorkerClass(topic, processor, config);

      return this._worker;
    }
  }

  public add(
    id: string,
    data: BullMqJobData,
    options: JobsOptions = {},
    groupId?: string
  ) {
    if (this.enabled) {
      this._queue.add(id, data, {
        ...options,
        ...(OldInstanceBullMqService.pro && groupId
          ? {
              group: {
                id: groupId,
              },
            }
          : {}),
      });
    }
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the BullMQ service down', LOG_CONTEXT);

    if (this._queue) {
      await this._queue.close();
    }
    if (this._worker) {
      await this._worker.close();
    }

    await this.inMemoryProviderService.shutdown();

    Logger.log('Shutting down the BullMQ service has finished', LOG_CONTEXT);
  }

  public async getStatus(): Promise<{
    queueIsPaused: boolean | undefined;
    queueName: string | undefined;
    workerIsPaused: boolean | undefined;
    workerIsRunning: boolean | undefined;
    workerName: string | undefined;
  }> {
    if (this.enabled) {
      const [queueIsPaused, workerIsPaused, workerIsRunning] =
        await Promise.all([
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
    } else {
      return {
        queueIsPaused: undefined,
        queueName: undefined,
        workerIsRunning: undefined,
        workerIsPaused: undefined,
        workerName: undefined,
      };
    }
  }

  public isClientReady(): boolean {
    return this.inMemoryProviderService.isClientReady();
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
    if (this.enabled && this._worker) {
      try {
        /**
         * We will only execute this in the cold start, therefore we will
         * expect jobs not being processed in the Worker.
         * Reference: https://api.docs.bullmq.io/classes/v4.Worker.html#pause.pause-1
         */
        const doNotWaitActive = true;

        await this._worker.pause(doNotWaitActive);
      } catch (error) {
        Logger.error(
          error,
          `Worker ${this._worker.name} pause failed`,
          LOG_CONTEXT
        );

        throw error;
      }
    }
  }

  public async resumeWorker(): Promise<void> {
    if (this.enabled && this._worker) {
      try {
        await this._worker.resume();
      } catch (error) {
        Logger.error(
          error,
          `Worker ${this._worker.name} resume failed`,
          LOG_CONTEXT
        );

        throw error;
      }
    }
  }
}
