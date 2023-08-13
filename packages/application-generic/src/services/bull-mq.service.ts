import {
  ConnectionOptions as RedisConnectionOptions,
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
import { EnvironmentId, getRedisPrefix, IJobData } from '@novu/shared';

interface IQueueMetrics {
  completed: Metrics;
  failed: Metrics;
}

const LOG_CONTEXT = 'BullMqService';

interface IEventJobData {
  event: string;
  userId: string;
  payload: Record<string, unknown>;
}

interface IEventCountData {
  event: string;
  userId: string;
  _environmentId: EnvironmentId;
}

type BullMqJobData = undefined | IJobData | IEventJobData | IEventCountData;

export {
  JobsOptions,
  QueueBaseOptions,
  RedisConnectionOptions as BullMqConnectionOptions,
  WorkerOptions,
};

export const bullMqBaseOptions = {
  connection: {
    db: Number(process.env.REDIS_DB_INDEX),
    port: Number(process.env.REDIS_PORT),
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 50000,
    keepAlive: 30000,
    family: 4,
    keyPrefix: getRedisPrefix(),
    tls: process.env.REDIS_TLS,
  },
};

@Injectable()
export class BullMqService {
  private _queue: Queue;
  private _worker: Worker;
  public static readonly pro: boolean =
    process.env.NOVU_MANAGED_SERVICE !== undefined;

  get worker() {
    return this._worker;
  }

  get queue() {
    return this._queue;
  }

  public static haveProInstalled(): boolean {
    if (!BullMqService.pro) {
      return false;
    }

    require('@taskforcesh/bullmq-pro');

    return true;
  }

  private runningWithProQueue() {
    return BullMqService.pro && BullMqService.haveProInstalled();
  }

  public async getQueueMetrics(): Promise<IQueueMetrics> {
    return {
      completed: await this._queue.getMetrics('completed'),
      failed: await this._queue.getMetrics('failed'),
    };
  }

  public createQueue(name: string, queueOptions: QueueOptions) {
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
      `Creating queue ${name} bullmq pro is ${
        this.runningWithProQueue() ? 'Enabled' : 'Disabled'
      }`
    );

    this._queue = new QueueClass(name, {
      ...config,
    });

    return this._queue;
  }

  public createWorker(
    name: string,
    processor?: string | Processor<any, unknown | void, string>,
    workerOptions?: WorkerOptions
  ) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerClass = !BullMqService.pro
      ? Worker
      : require('@taskforcesh/bullmq-pro').WorkerPro;

    const config: WorkerOptions = {
      connection: {
        ...bullMqBaseOptions.connection,
      },
      ...workerOptions,
      metrics: { maxDataPoints: MetricsTime.ONE_MONTH },
    };

    this._worker = new WorkerClass(name, processor, {
      ...config,
      ...(BullMqService.pro
        ? {
            group: {},
          }
        : {}),
    });

    return this._worker;
  }

  public add(
    id: string,
    data: BullMqJobData,
    options: JobsOptions = {},
    groupId?: string
  ) {
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

  public async getRunningStatus(): Promise<{
    queueIsPaused: boolean | undefined;
    queueName: string | undefined;
    workerIsRunning: boolean | undefined;
    workerName: string | undefined;
  }> {
    const queueIsPaused = this._queue
      ? await this._queue.isPaused()
      : undefined;
    const workerIsRunning = this._worker
      ? await this._worker.isRunning()
      : undefined;

    return {
      queueIsPaused,
      queueName: this._queue?.name,
      workerIsRunning,
      workerName: this._worker?.name,
    };
  }

  public async pauseWorker(): Promise<void> {
    if (this._worker) {
      await this._worker.pause();
    }
  }

  public async resumeWorker(): Promise<void> {
    if (this._worker) {
      await this._worker.resume();
    }
  }
}
