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
import { IEventJobData, IJobData, JobTopicNameEnum } from '@novu/shared';

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
};

@Injectable()
export class BullMqService {
  private _queue: Queue;
  private _worker: Worker;
  private inMemoryProviderService: InMemoryProviderService;

  public static readonly pro: boolean =
    process.env.NOVU_MANAGED_SERVICE !== undefined;

  constructor() {
    const getIsInMemoryClusterModeEnabled =
      new GetIsInMemoryClusterModeEnabled();
    this.inMemoryProviderService = new InMemoryProviderService(
      getIsInMemoryClusterModeEnabled,
      InMemoryProviderEnum.MEMORY_DB
    );
  }

  public async initialize(): Promise<void> {
    await this.inMemoryProviderService.delayUntilReadiness();
  }

  public get worker(): Worker {
    return this._worker;
  }

  get queue(): Queue {
    return this._queue;
  }

  public static haveProInstalled(): boolean {
    if (!BullMqService.pro) {
      return false;
    }

    require('@taskforcesh/bullmq-pro');

    return true;
  }

  private runningWithProQueue(): boolean {
    return BullMqService.pro && BullMqService.haveProInstalled();
  }

  public async getQueueMetrics(): Promise<IQueueMetrics> {
    return {
      completed: await this._queue.getMetrics('completed'),
      failed: await this._queue.getMetrics('failed'),
    };
  }

  private getQueueBaseOptions(): QueueBaseOptions {
    const inMemoryProviderConfig: IRedisProviderConfig =
      this.inMemoryProviderService.inMemoryProviderConfig;

    const bullMqBaseOptions = {
      connection: {
        db:
          this.inMemoryProviderService.getProvider !==
          InMemoryProviderEnum.MEMORY_DB
            ? Number(process.env.REDIS_DB_INDEX)
            : undefined,
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

  /**
   * To avoid going crazy not understanding why jobs are not processed in cluster mode
   * Reference:
   * https://github.com/taskforcesh/bullmq/issues/560
   * https://github.com/taskforcesh/bullmq/issues/1219
   */
  private addPrefixToConfig(prefix: JobTopicNameEnum, config) {
    return {
      ...config,
      //prefix: `{${prefix}}`,
    };
  }

  public createQueue(topic: JobTopicNameEnum, queueOptions: QueueOptions) {
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
    const QueueClass = !BullMqService.pro
      ? Queue
      : require('@taskforcesh/bullmq-pro').QueuePro;

    Logger.log(
      `Creating queue ${topic}. BullMQ pro is ${
        this.runningWithProQueue() ? 'Enabled' : 'Disabled'
      }`,
      LOG_CONTEXT
    );

    this._queue = new QueueClass(topic, this.addPrefixToConfig(topic, config));

    return this._queue;
  }

  public createWorker(
    topic: JobTopicNameEnum,
    processor?: string | Processor<any, unknown | void, string>,
    workerOptions?: WorkerOptions
  ) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerClass = !BullMqService.pro
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
      ...(BullMqService.pro
        ? {
            group: {},
          }
        : {}),
    };

    Logger.log(
      `Creating worker ${topic}. BullMQ pro is ${
        this.runningWithProQueue() ? 'Enabled' : 'Disabled'
      }`,
      LOG_CONTEXT
    );

    this._worker = new WorkerClass(
      topic,
      processor,
      this.addPrefixToConfig(topic, config)
    );

    return this._worker;
  }

  public add(
    id: string,
    data: BullMqJobData,
    options: JobsOptions = {},
    groupId?: string
  ) {
    Logger.verbose(
      { id, data, options },
      'Adding the job to the queue',
      LOG_CONTEXT
    );

    this._queue.add(id, data, {
      ...options,
      ...(BullMqService.pro && groupId
        ? {
            group: {
              id: groupId,
            },
          }
        : {}),
    });

    Logger.verbose({ id }, `Added the job ${id} to the queue`, LOG_CONTEXT);
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

    Logger.verbose(
      'Shutting down the BullMQ service has finished',
      LOG_CONTEXT
    );
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
    if (this._worker) {
      try {
        /**
         * We will only execute this in the cold start, therefore we will
         * expect jobs not being processed in the Worker.
         * Reference: https://api.docs.bullmq.io/classes/v4.Worker.html#pause.pause-1
         */
        const doNotWaitActive = true;

        await this._worker.pause(doNotWaitActive);
        Logger.verbose(
          `Worker ${this._worker.name} pause succeeded`,
          LOG_CONTEXT
        );
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
    if (this._worker) {
      try {
        await this._worker.resume();
        Logger.verbose(
          `Worker ${this._worker.name} resume succeeded`,
          LOG_CONTEXT
        );
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
