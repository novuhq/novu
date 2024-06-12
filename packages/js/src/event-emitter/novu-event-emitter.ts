import mitt, { Emitter } from 'mitt';

import { Events, EventHandler, EventNames } from './types';

export class NovuEventEmitter {
  private emitter: Emitter<Events>;

  constructor() {
    this.emitter = mitt();
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.emitter.on(eventName, listener);
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.emitter.on(eventName, listener);
  }

  emit<Key extends EventNames>(type: Key, event?: Events[Key]): void {
    this.emitter.emit(type, event);
  }
}
