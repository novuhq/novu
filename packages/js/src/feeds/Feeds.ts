import { NovuEventEmitter } from '../event-emitter';

export class Feeds {
  #emitter: NovuEventEmitter;

  constructor(emitter: NovuEventEmitter) {
    this.#emitter = emitter;
  }
}
