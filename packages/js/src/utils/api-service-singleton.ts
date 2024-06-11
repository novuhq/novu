import { ApiService } from '@novu/client';

const PRODUCTION_BACKEND_URL = 'https://api.novu.co';

type ApiServiceOptions = {
  backendUrl?: string;
};

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
