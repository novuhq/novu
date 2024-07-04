import { InboxService, InboxServiceOptions } from '../api';

export class InboxServiceSingleton {
  static #instance: InboxService;

  static getInstance(options?: InboxServiceOptions): InboxService {
    const isNeedsToRecreate = !!options;
    if (isNeedsToRecreate) {
      InboxServiceSingleton.#instance = new InboxService(options);
    }

    return InboxServiceSingleton.#instance;
  }
}
