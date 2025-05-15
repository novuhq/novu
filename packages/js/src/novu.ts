import { InboxService } from './api';
import type { EventHandler, EventNames, Events } from './event-emitter';
import { NovuEventEmitter } from './event-emitter';
import { Notifications } from './notifications';
import { Preferences } from './preferences';
import { Session } from './session';
import type { NovuOptions, Subscriber } from './types';
import { Socket } from './ws';

export class Novu implements Pick<NovuEventEmitter, 'on'> {
  #emitter: NovuEventEmitter;
  #session: Session;
  #inboxService: InboxService;

  public readonly notifications: Notifications;
  public readonly preferences: Preferences;
  public readonly socket: Socket;

  public on: <Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>) => () => void;
  /**
   * @deprecated
   * Use the cleanup function returned by the "on" method instead.
   */
  public off: <Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>) => void;

  public get applicationIdentifier() {
    return this.#session.applicationIdentifier;
  }

  public get subscriberId() {
    return this.#session.subscriberId;
  }

  constructor(options: NovuOptions) {
    this.#inboxService = new InboxService({
      apiUrl: ('apiUrl' in options && options.apiUrl) || ('backendUrl' in options && options.backendUrl) || undefined,
      userAgent: '__userAgent' in options ? options.__userAgent : undefined,
    });
    this.#emitter = new NovuEventEmitter();
    this.#session = new Session(
      {
        applicationIdentifier: 'applicationIdentifier' in options ? options.applicationIdentifier : undefined,
        subscriberHash: 'subscriberHash' in options ? options.subscriberHash : undefined,
        subscriber: buildSubscriber(options),
      },
      this.#inboxService,
      this.#emitter
    );
    this.#session.initialize();
    this.notifications = new Notifications({
      useCache: 'useCache' in options && options.useCache !== undefined ? options.useCache : true,
      inboxServiceInstance: this.#inboxService,
      eventEmitterInstance: this.#emitter,
    });
    this.preferences = new Preferences({
      useCache: 'useCache' in options && options.useCache !== undefined ? options.useCache : true,
      inboxServiceInstance: this.#inboxService,
      eventEmitterInstance: this.#emitter,
    });
    this.socket = new Socket({
      socketUrl: 'socketUrl' in options ? options.socketUrl : undefined,
      eventEmitterInstance: this.#emitter,
      inboxServiceInstance: this.#inboxService,
    });

    this.on = (eventName, listener) => {
      if (this.socket.isSocketEvent(eventName)) {
        this.socket.connect();
      }

      const cleanup = this.#emitter.on(eventName, listener);

      return () => {
        cleanup();
      };
    };

    this.off = (eventName, listener) => {
      this.#emitter.off(eventName, listener);
    };
  }
}

function buildSubscriber(options: NovuOptions): Subscriber {
  let subscriberObj: Subscriber;

  if (!('subscriber' in options)) {
    subscriberObj = { subscriberId: '' };
  } else if (options.subscriber) {
    subscriberObj = typeof options.subscriber === 'string' ? { subscriberId: options.subscriber } : options.subscriber;
  } else {
    subscriberObj = { subscriberId: options.subscriberId as string };
  }

  return subscriberObj;
}
