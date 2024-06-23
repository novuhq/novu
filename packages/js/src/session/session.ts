import type { ApiService } from '@novu/client';

import { ApiServiceSingleton } from '../utils/api-service-singleton';
import { InboxServiceSingleton } from '../utils/inbox-service-singleton';
import { NovuEventEmitter } from '../event-emitter';
import { InitializeSessionArgs } from './types';
import type { InboxService } from '../api';

export class Session {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;
  #inboxService: InboxService;
  #options: InitializeSessionArgs;

  constructor(options: InitializeSessionArgs) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#apiService = ApiServiceSingleton.getInstance();
    this.#inboxService = InboxServiceSingleton.getInstance();
    this.#options = options;
  }

  public async initialize(): Promise<void> {
    try {
      const { applicationIdentifier, subscriberId, subscriberHash } = this.#options;
      this.#emitter.emit('session.initialize.pending', { args: this.#options });

      const response = await this.#inboxService.initializeSession({
        applicationIdentifier,
        subscriberId,
        subscriberHash,
      });
      // TODO: remove when we will completely switch to the new InboxService
      this.#apiService.setAuthorizationToken(response.token);

      this.#emitter.emit('session.initialize.success', { args: this.#options, result: response });
    } catch (error) {
      this.#emitter.emit('session.initialize.error', { args: this.#options, error });
    }
  }
}
