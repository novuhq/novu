import {
  JobsOptions,
  Processor,
  Queue,
  QueueOptions,
  Worker,
  WorkerOptions,
} from 'bullmq';
import { Logger } from '@nestjs/common';

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

  public static haveProInstalled(): boolean {
    if (!BullmqService.pro) {
      return false;
    }

    require('@taskforcesh/bullmq-pro');

    return true;
  }

  private runningWithProQueue() {
    return BullmqService.pro && BullmqService.haveProInstalled();
  }

  public createQueue(name: string, config: QueueOptions) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const QueueClass = !BullmqService.pro
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
    processor?: string | Processor<any, any, any>,
    options?: WorkerOptions
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
