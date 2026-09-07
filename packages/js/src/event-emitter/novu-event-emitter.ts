import mitt, { Emitter } from 'mitt';
import { EventHandler, Events } from './types';
import type { WebChatMessagesUpdated } from './web-chat-events';

type InternalEvents = Events & {
  'web_chat.messages.updated': { data: WebChatMessagesUpdated };
};
type InternalEventNames = keyof InternalEvents;

export class NovuEventEmitter {
  #mittEmitter: Emitter<InternalEvents>;

  constructor() {
    this.#mittEmitter = mitt();
  }

  on<Key extends InternalEventNames>(eventName: Key, listener: EventHandler<InternalEvents[Key]>): () => void {
    this.#mittEmitter.on(eventName, listener);

    return () => {
      this.off(eventName, listener);
    };
  }

  off<Key extends InternalEventNames>(eventName: Key, listener: EventHandler<InternalEvents[Key]>): void {
    this.#mittEmitter.off(eventName, listener);
  }

  emit<Key extends InternalEventNames>(type: Key, event?: InternalEvents[Key]): void {
    this.#mittEmitter.emit(type, event as InternalEvents[Key]);
  }
}
