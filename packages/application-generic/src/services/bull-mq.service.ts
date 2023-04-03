import {
  JobsOptions,
  MetricsTime,
  Processor,
  Queue,
  QueueOptions,
  Worker,
  WorkerOptions,
} from 'bullmq';

export class BullmqService {
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

  public static haveProInstalled() {
    if (!BullmqService.pro) {
      return;
    }

    require('@taskforcesh/bullmq-pro');
  }

  public createQueue(name: string, config: QueueOptions) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const QueueClass = !BullmqService.pro
      ? Queue
      : require('@taskforcesh/bullmq-pro').QueuePro;

    this._queue = new QueueClass(name, {
      ...config,
    });

    return this._queue;
  }

  public createWorker(
    name: string,
    processor?: string | Processor<any, any, any>,
    options?: WorkerOptions
  ) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerClass = !BullmqService.pro
      ? Worker
      : require('@taskforcesh/bullmq-pro').WorkerPro;

    let internalOptions: WorkerOptions;
    if (options) {
      internalOptions = options;
    }
    internalOptions.metrics = { maxDataPoints: MetricsTime.ONE_MONTH };

    this._worker = new WorkerClass(name, processor, {
      ...internalOptions,
      ...(BullmqService.pro
        ? {
            group: {},
          }
        : {}),
    });

    return this._worker;
  }

  public add(
    id: string,
    data: any,
    options: JobsOptions = {},
    groupId?: string
  ) {
    this._queue.add(id, data, {
      ...options,
      ...(BullmqService.pro && groupId
        ? {
            group: {
              id: groupId,
            },
          }
        : {}),
    });
  }
}
