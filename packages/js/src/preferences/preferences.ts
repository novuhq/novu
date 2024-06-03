import { ApiService } from '@novu/client';

import { NovuEventEmitter } from '../event-emitter';

export class Preferences {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;

  constructor(emitter: NovuEventEmitter, apiService: ApiService) {
    this.#emitter = emitter;
    this.#apiService = apiService;
  }
}
