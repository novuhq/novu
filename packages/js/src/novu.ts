import { InboxService } from './api';
import { ChannelConnections } from './channel-connections';
import { ChannelEndpoints } from './channel-endpoints';
import type { EventHandler, EventNames, Events } from './event-emitter';
import { NovuEventEmitter } from './event-emitter';
import { Notifications } from './notifications';
import { Preferences } from './preferences';
import { Session } from './session';
import { Subscriptions } from './subscriptions';
import type { Context, NovuOptions, Subscriber } from './types';
import { buildContextKey, buildSubscriber } from './ui/internal';
import { createSocket } from './ws';
import type { BaseSocketInterface } from './ws/base-socket';

export class Novu implements Pick<NovuEventEmitter, 'on'> {
  #emitter: NovuEventEmitter;
  #session: Session;
  #inboxService: InboxService;
  #options: NovuOptions;

  public readonly notifications: Notifications;
  public readonly preferences: Preferences;
  public readonly subscriptions: Subscriptions;
  public readonly channelConnections: ChannelConnections;
  public readonly channelEndpoints: ChannelEndpoints;
  public readonly socket: BaseSocketInterface;

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

  public get context() {
    return this.#session.context;
  }

  public get options() {
    return this.#options;
  }

  public get contextKey() {
    return buildContextKey(this.#session.context);
  }

  constructor(options: NovuOptions) {
    this.#options = options;
    this.#inboxService = new InboxService({
      apiUrl: options.apiUrl || options.backendUrl,
    });
    this.#emitter = new NovuEventEmitter();
    const subscriber = buildSubscriber({ subscriberId: options.subscriberId, subscriber: options.subscriber });
    const contextKey = buildContextKey(options.context);
    this.#session = new Session(
      {
        applicationIdentifier: options.applicationIdentifier || '',
        subscriberHash: options.subscriberHash,
        subscriber,
        defaultSchedule: options.defaultSchedule,
        context: options.context,
        contextHash: options.contextHash,
      },
      this.#inboxService,
      this.#emitter
    );

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
    this.subscriptions = new Subscriptions({
      subscriber,
      contextKey,
      useCache: options.useCache ?? true,
      inboxServiceInstance: this.#inboxService,
      eventEmitterInstance: this.#emitter,
    });
    this.channelConnections = new ChannelConnections({
      inboxServiceInstance: this.#inboxService,
      eventEmitterInstance: this.#emitter,
    });
    this.channelEndpoints = new ChannelEndpoints({
      inboxServiceInstance: this.#inboxService,
      eventEmitterInstance: this.#emitter,
    });
    this.socket = createSocket({
      socketUrl: options.socketUrl,
      socketOptions: options.socketOptions,
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

  private clearCache(): void {
    this.notifications.cache.clearAll();
    this.preferences.cache.clearAll();
    this.preferences.scheduleCache.clearAll();
    this.subscriptions.cache.clearAll();
  }

  /**
   * @deprecated
   */
  public async changeSubscriber(options: { subscriber: Subscriber; subscriberHash?: string }): Promise<void> {
    await this.#session.initialize({
      applicationIdentifier: this.#session.applicationIdentifier || '',
      subscriberHash: options.subscriberHash,
      subscriber: options.subscriber,
      // Preserve existing context and contextHash
      context: this.#session.context,
      contextHash: this.#session.contextHash,
    });

    // Clear cache and reconnect socket with new token
    this.clearCache();

    // Disconnect and reconnect socket to use new JWT token
    const disconnectResult = await this.socket.disconnect();
    if (!disconnectResult.error) {
      await this.socket.connect();
    }
  }

  /**
   * @deprecated
   */
  public async changeContext(options: { context: Context; contextHash?: string }): Promise<void> {
    const currentSubscriber = this.#session.subscriber;
    if (!currentSubscriber) {
      throw new Error('Cannot change context without an active subscriber');
    }

    await this.#session.initialize({
      applicationIdentifier: this.#session.applicationIdentifier || '',
      // Preserve existing subscriber and subscriberHash
      subscriberHash: this.#session.subscriberHash,
      subscriber: currentSubscriber,
      context: options.context,
      contextHash: options.contextHash,
    });

    // Clear cache and reconnect socket with new token
    this.clearCache();

    // Disconnect and reconnect socket to use new JWT token
    const disconnectResult = await this.socket.disconnect();
    if (!disconnectResult.error) {
      await this.socket.connect();
    }
  }
}
