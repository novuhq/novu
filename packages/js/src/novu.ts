import { HttpClient, InboxService } from './api';
import { ChannelConnections } from './channel-connections';
import { ChannelEndpoints } from './channel-endpoints';
import type { EventHandler, EventNames, Events } from './event-emitter';
import { NovuEventEmitter } from './event-emitter';
import { Notifications } from './notifications';
import { Preferences } from './preferences';
import { Session } from './session';
import { resolveSessionIdentity, warnOnce } from './session/identity';
import { Subscriptions } from './subscriptions';
import type { Context, NovuOptions, Session as SessionData, Subscriber } from './types';
import type { WebChat } from './web-chat';
import { createSocket } from './ws';
import type { BaseSocketInterface } from './ws/base-socket';

export class Novu {
  #emitter: NovuEventEmitter;
  #session: Session;
  #httpClient: HttpClient;
  #inboxService: InboxService;
  #webChat?: WebChat;
  #webChatLoad?: Promise<WebChat>;
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

  public get contextHash() {
    return this.#session.contextHash;
  }

  public get options() {
    return this.#options;
  }

  public get contextKey() {
    return this.#session.contextKey;
  }

  /**
   * The latest session the server returned for the current subscriber and context (branding, development mode,
   * snooze limit, context keys), or `undefined` until it has resolved. Read it when you start listening after
   * `session.initialize.resolved` may already have fired.
   */
  public get session(): SessionData | undefined {
    return this.#session.data;
  }

  /**
   * Why the latest session request failed, or `undefined` once one succeeded. Read it when you start listening after
   * a failed `session.initialize.resolved` may already have fired.
   */
  public get sessionError(): unknown {
    return this.#session.error;
  }

  /**
   * True after `loadWebChat` has resolved on this instance.
   */
  public get isWebChatLoaded(): boolean {
    return this.#webChat !== undefined;
  }

  /**
   * Web Chat client. Call `loadWebChat` before first use.
   * @throws When Web Chat has not been loaded yet.
   */
  public get webChat(): WebChat {
    if (!this.#webChat) {
      throw new Error('Web Chat is not loaded. Call await novu.loadWebChat() before accessing novu.webChat.');
    }

    return this.#webChat;
  }

  /**
   * Load the Web Chat module. Safe to call more than one time.
   * Apps that never call this method do not download the Web Chat bundle.
   */
  public loadWebChat(): Promise<WebChat> {
    if (this.#webChat) {
      return Promise.resolve(this.#webChat);
    }

    if (this.#webChatLoad) {
      return this.#webChatLoad;
    }

    this.#webChatLoad = (async () => {
      try {
        const { createBoundWebChat } = await import('./web-chat/bind-web-chat');
        this.#webChat = createBoundWebChat({
          inboxService: this.#inboxService,
          emitter: this.#emitter,
          httpClient: this.#httpClient,
          socket: this.socket,
        });

        return this.#webChat;
      } catch (error) {
        this.#webChatLoad = undefined;
        throw error;
      }
    })();

    return this.#webChatLoad;
  }

  constructor(options: NovuOptions) {
    this.#options = options;
    this.#httpClient = new HttpClient({
      apiUrl: options.apiUrl || options.backendUrl,
    });
    this.#inboxService = new InboxService({
      httpClient: this.#httpClient,
    });
    this.#emitter = new NovuEventEmitter();
    const { identity, warnings } = resolveSessionIdentity(options);
    warnings.forEach(warnOnce);
    this.#session = new Session(
      {
        identity,
        defaultSchedule: options.defaultSchedule,
        onSubscriberChange: () => void this.#resetForNewSubscriber(),
      },
      this.#inboxService,
      this.#emitter
    );

    this.#session.start();
    this.#httpClient.setSession(this.#session);
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
      session: this.#session,
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
      refreshSession: (staleToken) => this.#session.refresh(staleToken),
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
    this.#webChat?.clearCache();
  }

  /** Drops the previous subscriber's data and reconnects the socket with the new session token. */
  async #resetForNewSubscriber(): Promise<void> {
    this.clearCache();

    const disconnectResult = await this.socket.disconnect();
    if (!disconnectResult.error) {
      await this.socket.connect();
    }
  }

  /**
   * @deprecated
   */
  public async changeSubscriber(options: { subscriber: Subscriber; subscriberHash?: string }): Promise<void> {
    await this.#session.changeIdentity((current) => ({
      ...current,
      subscriber: options.subscriber,
      subscriberHash: options.subscriberHash,
    }));

    await this.#resetForNewSubscriber();
  }

  /**
   * @deprecated
   */
  public async changeContext(options: { context: Context; contextHash?: string }): Promise<void> {
    await this.#session.changeIdentity((current) => ({
      ...current,
      context: options.context,
      contextHash: options.contextHash,
    }));

    await this.#resetForNewSubscriber();
  }
}
