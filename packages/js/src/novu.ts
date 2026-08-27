import type { AgentChat } from './agent-chat';
import { HttpClient, InboxService } from './api';
import { ChannelConnections } from './channel-connections';
import { ChannelEndpoints } from './channel-endpoints';
import type { EventHandler, EventNames, Events } from './event-emitter';
import { NovuEventEmitter } from './event-emitter';
import { Notifications } from './notifications';
import { Preferences } from './preferences';
import { Session } from './session';
import { Subscriptions } from './subscriptions';
import type { Context, NovuOptions, Subscriber } from './types';
import { buildContextKey } from './utils/build-context-key';
import { buildSubscriber } from './utils/build-subscriber';
import { createSocket } from './ws';
import type { BaseSocketInterface } from './ws/base-socket';

export class Novu implements Pick<NovuEventEmitter, 'on'> {
  #emitter: NovuEventEmitter;
  #session: Session;
  #httpClient: HttpClient;
  #inboxService: InboxService;
  #agentChat?: AgentChat;
  #agentChatLoad?: Promise<AgentChat>;
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
    return buildContextKey(this.#session.context);
  }

  /**
   * True after {@link Novu.loadAgentChat} has resolved on this instance.
   */
  public get isAgentChatLoaded(): boolean {
    return this.#agentChat !== undefined;
  }

  /**
   * Agent Chat runtime. Call {@link Novu.loadAgentChat} before first use.
   * @throws When Agent Chat has not been loaded yet.
   */
  public get agentChat(): AgentChat {
    if (!this.#agentChat) {
      throw new Error('Agent Chat is not loaded. Call await novu.loadAgentChat() before accessing novu.agentChat.');
    }

    return this.#agentChat;
  }

  /**
   * Loads the Agent Chat module. Idempotent — safe to call multiple times.
   * Inbox-only apps that never call this method do not download the agent graph.
   */
  public loadAgentChat(): Promise<AgentChat> {
    if (this.#agentChat) {
      return Promise.resolve(this.#agentChat);
    }

    if (this.#agentChatLoad) {
      return this.#agentChatLoad;
    }

    this.#agentChatLoad = (async () => {
      try {
        const { createBoundAgentChat } = await import('./agent-chat/bind-agent-chat');
        this.#agentChat = createBoundAgentChat({
          inboxService: this.#inboxService,
          emitter: this.#emitter,
          httpClient: this.#httpClient,
          socket: this.socket,
        });

        return this.#agentChat;
      } catch (error) {
        this.#agentChatLoad = undefined;
        throw error;
      }
    })();

    return this.#agentChatLoad;
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
    this.#agentChat?.clearCache();
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
