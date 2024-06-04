import { NovuEventEmitter } from '../event-emitter';

export interface SessionOptions {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash?: string;
}

export class Session {
  #emitter: NovuEventEmitter;

  constructor(emitter: NovuEventEmitter, options: SessionOptions) {
    this.#emitter = emitter;
  }

  public initialize(): void {}
}
