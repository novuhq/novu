import { JobsOptions, Processor, Queue, QueueBaseOptions, QueueOptions, QueueScheduler, Worker } from 'bullmq';

export class BullmqService {
  private readonly _queue: Queue;
  private _worker: Worker;
  private _queueScheduler: QueueScheduler;
  private readonly pro: boolean = process.env.NPM_TASKFORCESH_TOKEN !== undefined;

  constructor(name: string, config: QueueOptions) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const QueueClass = !this.pro ? Queue : require('@taskforcesh/bullmq-pro').QueuePro;

    this._queue = new QueueClass(name, {
      ...config,
    });
  }

  get worker() {
    return this._worker;
  }

  get queue() {
    return this._queue;
  }

  public createWorker(name: string, processor?: string | Processor<any, any, any>, options?: QueueBaseOptions) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerClass = !this.pro ? Worker : require('@taskforcesh/bullmq-pro').WorkerPro;
    this._worker = new WorkerClass(name, processor, {
      ...options,
      ...(this.pro
        ? {
            group: {},
          }
        : {}),
    });
  }

  public createScheduler(name: string, config: QueueBaseOptions) {
    this._queueScheduler = new QueueScheduler(name, config);
  }

  public add(id: string, data: any, options: JobsOptions = {}, groupId?: string) {
    this._queue.add(id, data, {
      ...options,
      ...(this.pro && groupId
        ? {
            group: {
              id: groupId,
            },
          }
        : {}),
    });
  }
}
