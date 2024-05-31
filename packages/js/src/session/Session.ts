import { NovuEventEmitter } from '../event-emitter';

export interface SessionOptions {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash?: string;
}

export class Session {
  constructor(private emitter: NovuEventEmitter, options: SessionOptions) {}

  public initialize(): void {}
}
