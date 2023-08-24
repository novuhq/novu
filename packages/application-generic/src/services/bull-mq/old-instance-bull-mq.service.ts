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
import { GetIsInMemoryClusterModeEnabled } from '../../usecases';

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
    if (
      !process.env.IS_DOCKER_HOSTED &&
      process.env.MEMORY_DB_CLUSTER_SERVICE_HOST
    ) {
      const getIsInMemoryClusterModeEnabled =
        new GetIsInMemoryClusterModeEnabled();
      this.inMemoryProviderService = new InMemoryProviderService(
        getIsInMemoryClusterModeEnabled,
        InMemoryProviderEnum.OLD_INSTANCE_REDIS
      );
      this.enabled = true;
    } else {
      this.enabled = false;
    }
  }

  public async initialize() {
    if (this.enabled) {
      await this.inMemoryProviderService.delayUntilReadiness();
    }
  }

  get worker(): Worker {
    return this._worker;
  }

  get queue(): Queue {
    return this._queue;
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
        completed: await this._queue.getMetrics('completed'),
        failed: await this._queue.getMetrics('failed'),
      };
    } else {
      return {
        completed: undefined,
        failed: undefined,
      };
    }
  }

  private getQueueBaseOptions(): QueueBaseOptions {
    const inMemoryProviderConfig: IRedisProviderConfig =
      this.inMemoryProviderService.inMemoryProviderConfig;

    const bullMqBaseOptions = {
      connection: {
        db: Number(process.env.REDIS_DB_INDEX),
        port: inMemoryProviderConfig.port,
        host: inMemoryProviderConfig.host,
        username: inMemoryProviderConfig.username,
        password: inMemoryProviderConfig.password,
        connectTimeout: inMemoryProviderConfig.connectTimeout,
        keepAlive: inMemoryProviderConfig.ttl,
        family: inMemoryProviderConfig.family,
        keyPrefix: inMemoryProviderConfig.keyPrefix,
        tls: inMemoryProviderConfig.tls,
      },
    };

    return bullMqBaseOptions;
  }

  public createQueue(topic: JobTopicNameEnum, queueOptions: QueueOptions) {
    if (this.enabled) {
      const bullMqBaseOptions: QueueBaseOptions = this.getQueueBaseOptions();

      const config = {
        connection: {
          ...bullMqBaseOptions.connection,
          ...queueOptions.connection,
        },
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

      const bullMqBaseOptions = this.getQueueBaseOptions();
      const { concurrency, connection, lockDuration, settings } = workerOptions;

      const config = {
        connection: {
          ...bullMqBaseOptions.connection,
          ...connection,
        },
        ...(concurrency && { concurrency }),
        ...(lockDuration && { lockDuration }),
        ...(settings && { settings }),
        metrics: { maxDataPoints: MetricsTime.ONE_MONTH },
      };

      Logger.log(
        `Creating worker for old instance. BullMQ pro is ${
          this.runningWithProQueue() ? 'Enabled' : 'Disabled'
        }`,
        LOG_CONTEXT
      );

      this._worker = new WorkerClass(topic, processor, {
        ...config,
        ...(OldInstanceBullMqService.pro
          ? {
              group: {},
            }
          : {}),
      });

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

  public async getRunningStatus(): Promise<{
    queueIsPaused: boolean | undefined;
    queueName: string | undefined;
    workerIsPaused: boolean | undefined;
    workerIsRunning: boolean | undefined;
    workerName: string | undefined;
  }> {
    if (this.enabled) {
      const queueIsPaused = this._queue
        ? await this._queue.isPaused()
        : undefined;
      const workerIsPaused = this._worker
        ? await this._worker.isPaused()
        : undefined;
      const workerIsRunning = this._worker
        ? await this._worker.isRunning()
        : undefined;

      return {
        queueIsPaused,
        queueName: this._queue?.name,
        workerIsRunning,
        workerIsPaused,
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

  public async pauseWorker(): Promise<void> {
    if (this.enabled && this._worker) {
      try {
        await this._worker.pause(true);
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
