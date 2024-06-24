import { ApiService } from '@novu/client';

import { PRODUCTION_BACKEND_URL } from './config';

type ApiServiceOptions = {
  backendUrl?: string;
};

/**
 * @deprecated Use the `InboxServiceSingleton` instead.
 */
export class ApiServiceSingleton {
  static #instance: ApiService;

  static getInstance(options?: ApiServiceOptions): ApiService {
    const isNeedsToRecreate = !!options;
    if (isNeedsToRecreate) {
      ApiServiceSingleton.#instance = new ApiService(options.backendUrl ?? PRODUCTION_BACKEND_URL);
    }

    return ApiServiceSingleton.#instance;
  }
}
