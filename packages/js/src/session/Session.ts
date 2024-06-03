import { ApiService } from '@novu/client';

import { NovuEventEmitter } from '../event-emitter';

export interface SessionOptions {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash?: string;
}

export class Session {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;
  #options: SessionOptions;

  constructor(emitter: NovuEventEmitter, apiService: ApiService, options: SessionOptions) {
    this.#emitter = emitter;
    this.#apiService = apiService;
    this.#options = options;
  }

  public async initialize(): Promise<void> {
    try {
      this.#emitter.emit('session.initialize.pending');

      const { token, profile } = await this.#apiService.initializeSession(
        this.#options.applicationIdentifier,
        this.#options.subscriberId,
        this.#options.subscriberHash
      );
      this.#apiService.setAuthorizationToken(token);

      this.#emitter.emit('session.initialize.success', { token, profile });
    } catch (error) {
      this.#emitter.emit('session.initialize.error', { error });
    }
  }
}
