import mitt, { Emitter } from 'mitt';

import { EventHandler, Events, EventNames } from './types';

type SingletonOptions = { recreate: true };

export class NovuEventEmitter {
  static #instance: NovuEventEmitter;
  #mittEmitter: Emitter<Events>;

  static getInstance(options?: SingletonOptions): NovuEventEmitter {
    if (options?.recreate) {
      NovuEventEmitter.#instance = new NovuEventEmitter();
    }

    return NovuEventEmitter.#instance;
  }

  private constructor() {
    this.#mittEmitter = mitt();
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#mittEmitter.on(eventName, listener);
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#mittEmitter.off(eventName, listener);
  }

  emit<Key extends EventNames>(type: Key, event?: Events[Key]): void {
    this.#mittEmitter.emit(type, event as Events[Key]);
  }
}
