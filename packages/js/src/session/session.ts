import { InboxServiceSingleton } from '../utils/inbox-service-singleton';
import { NovuEventEmitter } from '../event-emitter';
import { InitializeSessionArgs } from './types';
import type { InboxService } from '../api';

export class Session {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  #options: InitializeSessionArgs;

  constructor(options: InitializeSessionArgs) {
    this.#emitter = NovuEventEmitter.getInstance();
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

      this.#emitter.emit('session.initialize.resolved', { args: this.#options, data: response });
    } catch (error) {
      this.#emitter.emit('session.initialize.resolved', { args: this.#options, error });
    }
  }
}
