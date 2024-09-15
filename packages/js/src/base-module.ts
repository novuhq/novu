import { InboxService } from './api';
import { NovuEventEmitter } from './event-emitter';
import { Result, Session } from './types';
import { NovuError } from './utils/errors';

interface CallQueueItem {
  fn: () => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (value: any | PromiseLike<any>) => void;
  reject: (reason?: unknown) => void;
}

export class BaseModule {
  protected _inboxService: InboxService;
  protected _emitter: NovuEventEmitter;
  #callsQueue: CallQueueItem[] = [];
  #sessionError: unknown;

  constructor({
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    this._emitter = eventEmitterInstance;
    this._inboxService = inboxServiceInstance;
    this._emitter.on('session.initialize.resolved', ({ error, data }) => {
      if (data) {
        this.onSessionSuccess(data);
        this.#callsQueue.forEach(async ({ fn, resolve }) => {
          resolve(await fn());
        });
        this.#callsQueue = [];
      } else if (error) {
        this.onSessionError(error);
        this.#sessionError = error;
        this.#callsQueue.forEach(({ resolve }) => {
          resolve({ error: new NovuError('Failed to initialize session, please contact the support', error) });
        });
        this.#callsQueue = [];
      }
    });
  }

  protected onSessionSuccess(_: Session): void {}

  protected onSessionError(_: unknown): void {}

  async callWithSession<T>(fn: () => Result<T>): Result<T> {
    if (this._inboxService.isSessionInitialized) {
      return fn();
    }

    if (this.#sessionError) {
      return Promise.resolve({
        error: new NovuError('Failed to initialize session, please contact the support', this.#sessionError),
      });
    }

    return new Promise((resolve, reject) => {
      this.#callsQueue.push({ fn, resolve, reject });
    });
  }
}
