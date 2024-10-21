import mitt, { Emitter } from 'mitt';
import { EventHandler, Events, EventNames } from './types';

export class NovuEventEmitter {
  #mittEmitter: Emitter<Events>;

  constructor() {
    this.#mittEmitter = mitt();
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): () => void {
    this.#mittEmitter.on(eventName, listener);

    return () => {
      this.off(eventName, listener);
    };
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#mittEmitter.off(eventName, listener);
  }

  emit<Key extends EventNames>(type: Key, event?: Events[Key]): void {
    this.#mittEmitter.emit(type, event as Events[Key]);
  }
}
