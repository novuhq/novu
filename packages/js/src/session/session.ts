import { ApiService } from '@novu/client';

import { NovuEventEmitter } from '../event-emitter';
import { ApiServiceSingleton } from '../utils/api-service-singleton';
import { InitializeSessionArgs } from './types';

export class Session {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;
  #options: InitializeSessionArgs;

  constructor(options: InitializeSessionArgs) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#apiService = ApiServiceSingleton.getInstance();
    this.#options = options;
  }

  public async initialize(): Promise<void> {
    try {
      const { applicationIdentifier, subscriberId, subscriberHash } = this.#options;
      this.#emitter.emit('session.initialize.pending', { args: this.#options });

      const response = await this.#apiService.initializeSession(applicationIdentifier, subscriberId, subscriberHash);
      this.#apiService.setAuthorizationToken(response.token);

      this.#emitter.emit('session.initialize.success', { args: this.#options, result: response });
    } catch (error) {
      this.#emitter.emit('session.initialize.error', { args: this.#options, error });
    }
  }
}
