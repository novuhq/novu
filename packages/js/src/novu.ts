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
  #currentSubscriberId: string;

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
      apiUrl: options.apiUrl || options.backendUrl,
      userAgent: options.__userAgent,
    });
    this.#emitter = new NovuEventEmitter();
    this.#session = new Session(
      {
        applicationIdentifier: options.applicationIdentifier || '',
        subscriberHash: options.subscriberHash,
        subscriber: buildSubscriber(options),
      },
      this.#inboxService,
      this.#emitter
    );

    const initialSubscriber = buildSubscriber(options);
    this.#currentSubscriberId = initialSubscriber.subscriberId;

    this.#session.initialize();
    this.notifications = new Notifications({
      useCache: options.useCache ?? true,
      inboxServiceInstance: this.#inboxService,
      eventEmitterInstance: this.#emitter,
    });
    this.preferences = new Preferences({
      useCache: options.useCache ?? true,
      inboxServiceInstance: this.#inboxService,
      eventEmitterInstance: this.#emitter,
    });
    this.socket = new Socket({
      socketUrl: options.socketUrl,
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

  public async changeSubscriber(options: { subscriber: Subscriber; subscriberHash?: string }): Promise<void> {
    if (this.#currentSubscriberId === options.subscriber.subscriberId) {
      return;
    }

    await this.#session.initialize({
      applicationIdentifier: this.#session.applicationIdentifier || '',
      subscriberHash: options.subscriberHash,
      subscriber: options.subscriber,
    });

    this.#currentSubscriberId = options.subscriber.subscriberId;
  }
}

function buildSubscriber(options: NovuOptions): Subscriber {
  // subscriber object
  if (options.subscriber) {
    return typeof options.subscriber === 'string' ? { subscriberId: options.subscriber } : options.subscriber;
  }

  // subscriberId
  if (options.subscriberId) {
    return { subscriberId: options.subscriberId as string };
  }

  // missing - keyless subscriber, the api will generate a subscriberId
  return { subscriberId: '' };
}
