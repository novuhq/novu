import {
  JobsOptions,
  Processor,
  Queue,
  QueueBaseOptions,
  QueueOptions,
  QueueScheduler,
  Worker,
} from 'bullmq';

export class BullmqService {
  private _queue: Queue;
  private _worker: Worker;
  private _queueScheduler: QueueScheduler;
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
    options?: any
  ) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerClass = !BullmqService.pro
      ? Worker
      : require('@taskforcesh/bullmq-pro').WorkerPro;
    this._worker = new WorkerClass(name, processor, {
      ...options,
      ...(BullmqService.pro
        ? {
            group: {},
          }
        : {}),
    });

    return this._worker;
  }

  public createScheduler(name: string, config: QueueBaseOptions) {
    this._queueScheduler = new QueueScheduler(name, config);

    return this._queueScheduler;
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
