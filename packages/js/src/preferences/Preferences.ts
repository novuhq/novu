import { NovuEventEmitter } from '../event-emitter';

export class Preferences {
  #emitter: NovuEventEmitter;

  constructor(emitter: NovuEventEmitter) {
    this.#emitter = emitter;
  }
}
