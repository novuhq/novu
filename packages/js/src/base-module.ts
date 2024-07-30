import type { ApiService } from '@novu/client';
import { InboxService } from './api';

import { NovuEventEmitter } from './event-emitter';
import { Session } from './types';
import { ApiServiceSingleton } from './utils/api-service-singleton';
import { InboxServiceSingleton } from './utils/inbox-service-singleton';

interface CallQueueItem {
  fn: () => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (value: any | PromiseLike<any>) => void;
  reject: (reason?: unknown) => void;
}

export class BaseModule {
  _apiService: ApiService;
  _inboxService: InboxService;
  _emitter: NovuEventEmitter;
  #callsQueue: CallQueueItem[] = [];
  #sessionError: unknown;

  constructor() {
    this._emitter = NovuEventEmitter.getInstance();
    this._apiService = ApiServiceSingleton.getInstance();
    this._inboxService = InboxServiceSingleton.getInstance();
    this._emitter.on('session.initialize.resolved', ({ error, data }) => {
      if (data) {
        this.onSessionSuccess(data);
        this.#callsQueue.forEach(async ({ fn, resolve }) => {
          resolve(await fn());
        });
      } else if (error) {
        this.onSessionError(error);
        this.#sessionError = error;
        this.#callsQueue.forEach(({ reject }) => {
          reject(error);
        });
      }
      this.#callsQueue = [];
    });
  }

  protected onSessionSuccess(_: Session): void {}

  protected onSessionError(_: unknown): void {}

  async callWithSession<T>(fn: () => Promise<T>): Promise<T> {
    if (this._apiService.isAuthenticated) {
      return fn();
    }

    if (this.#sessionError) {
      return Promise.reject(this.#sessionError);
    }

    return new Promise(async (resolve, reject) => {
      this.#callsQueue.push({ fn, resolve, reject });
    });
  }
}
