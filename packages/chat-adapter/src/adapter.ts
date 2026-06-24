import type {
  AdapterPostableMessage,
  ChatInstance,
  Message as ChatMessage,
  EmojiValue,
  FetchOptions,
  FetchResult,
  FormattedContent,
  RawMessage,
  StateAdapter,
  StreamChunk,
  StreamOptions,
  ThreadInfo,
  UserInfo,
  WebhookOptions,
} from 'chat';
import { handleBridgeProbe } from './bridge-probe.js';
import { type ChatModuleParts, MessageMapper } from './message-mapper.js';
import { ReplyClient } from './reply-client.js';
import { patchSnapshotFromSignals, patchSnapshotResolved } from './snapshot-store.js';
import { deliverBufferedStream, deliverStreamingWithEdits, shouldBufferStream } from './stream-delivery.js';
import { channelIdFromThreadId, decodeThreadId, encodeThreadId, isDMThreadId } from './thread-id.js';
import {
  type AgentBridgeRequest,
  AgentEvent,
  type AgentMessageAuthor,
  type AgentReplyPayload,
  type AgentSubscriber,
  type NovuAdapterConfig,
  type NovuRawMessage,
  type NovuThreadId,
  type NovuTypedAdapter,
  type Signal,
  type ThreadSnapshot,
} from './types.js';
import { WebhookHandler } from './webhook-handler.js';

const SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEDUPE_TTL_MS = 60 * 60 * 1000; // 1 hour

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not supported by the Novu adapter`);
    this.name = 'NotImplementedError';
  }
}

const deliveryKey = (deliveryId: string): string => `novu:delivery:${deliveryId}`;
const snapshotKey = (threadId: string): string => `novu:snapshot:${threadId}`;
const subscriberKey = (subscriberId: string): string => `novu:subscriber:${subscriberId}`;
const DEFAULT_FETCH_LIMIT = 50;

function paginateHistoryMessages<TRaw>(allMessages: ChatMessage<TRaw>[], options: FetchOptions): FetchResult<TRaw> {
  const total = allMessages.length;
  if (total === 0) {
    return { messages: [] };
  }

  const direction = options.direction ?? 'backward';
  const limit = options.limit ?? DEFAULT_FETCH_LIMIT;
  const cursor = options.cursor;

  if (direction === 'backward') {
    const endExclusive = cursor === undefined ? total : Number(cursor);
    if (cursor !== undefined && (Number.isNaN(endExclusive) || endExclusive <= 0 || endExclusive > total)) {
      return { messages: [] };
    }

    const start = Math.max(0, endExclusive - limit);
    const messages = allMessages.slice(start, endExclusive);
    const nextCursor = start > 0 ? String(start) : undefined;

    return { messages, nextCursor };
  }

  const start = cursor === undefined ? 0 : Number(cursor);
  if (cursor !== undefined && (Number.isNaN(start) || start < 0 || start >= total)) {
    return { messages: [] };
  }

  const endExclusive = Math.min(total, start + limit);
  const messages = allMessages.slice(start, endExclusive);
  const nextCursor = endExclusive < total ? String(endExclusive) : undefined;

  return { messages, nextCursor };
}

export class NovuAdapterImpl implements NovuTypedAdapter {
  readonly name = 'novu';
  readonly userName: string;
  readonly persistMessageHistory = false;

  private readonly config: NovuAdapterConfig;
  private readonly mapper = new MessageMapper();
  private readonly webhookHandler: WebhookHandler;
  private readonly replyClient: ReplyClient;
  private chat: ChatInstance | null = null;
  private stringifyMarkdown!: (ast: FormattedContent) => string;
  private getEmojiFn!: (name: string) => EmojiValue;

  constructor(config: NovuAdapterConfig) {
    if (!config.apiKey) throw new Error('createNovuAdapter: `apiKey` is required');
    if (!config.agentIdentifier) throw new Error('createNovuAdapter: `agentIdentifier` is required');
    if (!config.bridgeSecret) throw new Error('createNovuAdapter: `bridgeSecret` is required');

    this.config = config;
    this.userName = `novu-agent-${config.agentIdentifier}`;
    this.webhookHandler = new WebhookHandler(config.bridgeSecret, config.maxSignatureAgeMs);
    this.replyClient = new ReplyClient(config);
  }

  async initialize(chat: ChatInstance): Promise<void> {
    this.chat = chat;

    const chatModule = await import('chat');
    this.stringifyMarkdown = chatModule.stringifyMarkdown;
    this.getEmojiFn = chatModule.getEmoji;
    this.mapper.setChatModule({
      Message: chatModule.Message as unknown as ChatModuleParts['Message'],
      parseMarkdown: chatModule.parseMarkdown,
      stringifyMarkdown: chatModule.stringifyMarkdown,
      toCardElement: chatModule.toCardElement as unknown as ChatModuleParts['toCardElement'],
      isCardElement: chatModule.isCardElement,
    });
  }

  private state(): StateAdapter {
    if (!this.chat) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    return this.chat.getState();
  }

  // -- Thread id --

  encodeThreadId(data: NovuThreadId): string {
    return encodeThreadId(data);
  }

  decodeThreadId(threadId: string): NovuThreadId {
    return decodeThreadId(threadId);
  }

  channelIdFromThreadId(threadId: string): string {
    return channelIdFromThreadId(threadId);
  }

  isDM(threadId: string): boolean {
    return isDMThreadId(threadId);
  }

  // -- Inbound --

  async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
    const probeResponse = handleBridgeProbe(request, this.config.agentIdentifier);
    if (probeResponse) {
      return probeResponse;
    }

    if (!this.chat) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    const { request: bridge, status } = await this.webhookHandler.parseAndVerify(request);
    if (!bridge) {
      return new Response(null, { status });
    }

    const state = this.state();
    const dedupeKey = deliveryKey(bridge.deliveryId);

    // Dedupe replayed deliveries (platform retries, at-least-once bridge delivery).
    if (await state.get(dedupeKey)) {
      return new Response(null, { status: 200 });
    }

    const threadId = this.threadIdFor(bridge);

    await this.cacheSnapshot(threadId, bridge);

    // Pre-seed subscription from server truth so an ongoing conversation routes to
    // `onSubscribedMessage`. Novu persists inbound before building the bridge, so
    // `history` already includes the current message on the first turn — use
    // `messageCount` only. A brand-new conversation (messageCount === 1) stays
    // unsubscribed and routes to `onNewMention` (use `thread.isDM` for first DM vs
    // channel — do not register `onDirectMessage` if you want ongoing DMs on
    // `onSubscribedMessage`).
    if (bridge.conversation.messageCount > 1) {
      await state.subscribe(threadId);
    }

    switch (bridge.event) {
      case AgentEvent.ON_MESSAGE:
        await this.dispatchMessage(threadId, bridge, options);
        break;
      case AgentEvent.ON_ACTION:
        await this.dispatchAction(threadId, bridge, options);
        break;
      case AgentEvent.ON_REACTION:
        await this.dispatchReaction(threadId, bridge, options);
        break;
      case AgentEvent.ON_RESOLVE:
        // ACK only in v1.
        break;
      default:
        this.chat.getLogger('novu-adapter').warn('Unknown bridge event', { event: bridge.event });
    }

    await state.set(dedupeKey, '1', DEDUPE_TTL_MS);

    return new Response(null, { status: 200 });
  }

  private threadIdFor(bridge: AgentBridgeRequest): string {
    return encodeThreadId({
      platform: bridge.platform,
      integrationIdentifier: bridge.integrationIdentifier,
      conversationId: bridge.conversationId,
      isDM: bridge.platformContext?.isDM ?? false,
    });
  }

  private async cacheSnapshot(threadId: string, bridge: AgentBridgeRequest): Promise<void> {
    const snapshot: ThreadSnapshot = {
      history: bridge.history,
      conversation: bridge.conversation,
      subscriber: bridge.subscriber,
      platform: bridge.platform,
      platformContext: bridge.platformContext,
    };
    const state = this.state();
    const writes: Promise<void>[] = [this.saveSnapshot(threadId, snapshot)];

    // Also index the subscriber by id so the SDK-native `getUser(userId)` can
    // resolve it (the inbound author's `userId` is the `subscriberId`).
    if (bridge.subscriber) {
      writes.push(state.set(subscriberKey(bridge.subscriber.subscriberId), bridge.subscriber, SNAPSHOT_TTL_MS));
    }

    await Promise.all(writes);
  }

  private async dispatchMessage(threadId: string, bridge: AgentBridgeRequest, options?: WebhookOptions): Promise<void> {
    if (!bridge.message || !this.chat) return;

    const raw = this.mapper.toRawMessage(bridge.message, {
      conversationId: bridge.conversationId,
      integrationIdentifier: bridge.integrationIdentifier,
      platform: bridge.platform,
    });
    const message = this.mapper.buildMessage(raw, threadId, this.humanAuthor(bridge));
    await this.chat.processMessage(this, threadId, message, options);
  }

  private async dispatchAction(threadId: string, bridge: AgentBridgeRequest, options?: WebhookOptions): Promise<void> {
    if (!bridge.action || !this.chat) return;

    await this.chat.processAction(
      {
        actionId: bridge.action.id,
        messageId: bridge.action.sourceMessageId ?? '',
        value: bridge.action.value,
        raw: bridge,
        threadId,
        user: this.mapper.toAuthor(this.humanAuthor(bridge)),
        adapter: this,
      },
      options
    );
  }

  private async dispatchReaction(
    threadId: string,
    bridge: AgentBridgeRequest,
    options?: WebhookOptions
  ): Promise<void> {
    if (!bridge.reaction || !this.chat) return;

    const reactedMessage = bridge.reaction.message
      ? this.mapper.buildMessage(
          this.mapper.toRawMessage(bridge.reaction.message, {
            conversationId: bridge.conversationId,
            integrationIdentifier: bridge.integrationIdentifier,
            platform: bridge.platform,
          }),
          threadId
        )
      : undefined;

    await this.chat.processReaction(
      {
        added: bridge.reaction.added,
        emoji: this.getEmojiFn(bridge.reaction.emoji.name),
        message: reactedMessage,
        messageId: bridge.reaction.messageId,
        rawEmoji: bridge.reaction.emoji.name,
        raw: bridge,
        threadId,
        user: this.mapper.toAuthor(this.humanAuthor(bridge)),
        adapter: this,
      },
      options
    );
  }

  /**
   * Canonical human-actor identity for inbound messages, actions, and reactions.
   * The Novu subscriber is the source of truth, so `userId` is the
   * `subscriberId` — this keeps `message.author`, `getParticipants()`, and
   * `adapter.getUser(userId)` consistent. The platform-native `userName` /
   * `fullName` are preserved (the raw platform author stays on
   * `message.raw.author`). Falls back to the platform author when no subscriber
   * is present.
   */
  private humanAuthor(bridge: AgentBridgeRequest): AgentMessageAuthor {
    const platformAuthor = bridge.message?.author;
    const sub = bridge.subscriber;

    if (!sub) {
      return (
        platformAuthor ?? {
          userId: 'novu-subscriber',
          userName: 'novu-subscriber',
          fullName: 'Subscriber',
          isBot: false,
        }
      );
    }

    const fullName = [sub.firstName, sub.lastName].filter(Boolean).join(' ');

    return {
      userId: sub.subscriberId,
      userName: platformAuthor?.userName ?? sub.subscriberId,
      fullName: fullName || platformAuthor?.fullName || sub.subscriberId,
      isBot: false,
    };
  }

  parseMessage(raw: NovuRawMessage): ChatMessage<NovuRawMessage> {
    const threadId = encodeThreadId({
      platform: raw.platform,
      integrationIdentifier: raw.integrationIdentifier,
      conversationId: raw.conversationId,
      isDM: false,
    });

    return this.mapper.buildMessage(raw, threadId);
  }

  // -- Outbound --

  async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage<NovuRawMessage>> {
    const decoded = decodeThreadId(threadId);
    const info = await this.replyClient.send(
      this.replyPayload(decoded, {
        reply: await this.mapper.toReplyContent(message),
      })
    );
    const messageId = info?.messageId ?? `novu-reply:${decoded.conversationId}`;

    return {
      id: messageId,
      raw: this.outboundRaw(decoded, messageId),
      threadId,
    };
  }

  async stream(
    threadId: string,
    textStream: AsyncIterable<string | StreamChunk>,
    options?: StreamOptions
  ): Promise<RawMessage<NovuRawMessage>> {
    const decoded = decodeThreadId(threadId);
    const deps = {
      postMessage: (id: string, message: AdapterPostableMessage) => this.postMessage(id, message),
      editMessage: (id: string, messageId: string, message: AdapterPostableMessage) =>
        this.editMessage(id, messageId, message),
    };

    if (shouldBufferStream(decoded.platform)) {
      return deliverBufferedStream(threadId, textStream, deps);
    }

    return deliverStreamingWithEdits(threadId, textStream, deps, options);
  }

  async editMessage(
    threadId: string,
    messageId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<NovuRawMessage>> {
    const decoded = decodeThreadId(threadId);
    const info = await this.replyClient.send(
      this.replyPayload(decoded, {
        edit: { messageId, content: await this.mapper.toReplyContent(message) },
      })
    );
    const resolvedId = info?.messageId ?? messageId;

    return {
      id: resolvedId,
      raw: this.outboundRaw(decoded, resolvedId),
      threadId,
    };
  }

  async addReaction(threadId: string, messageId: string, emoji: EmojiValue | string): Promise<void> {
    const decoded = decodeThreadId(threadId);
    await this.replyClient.send(
      this.replyPayload(decoded, {
        addReactions: [{ messageId, emojiName: this.emojiName(emoji) }],
      })
    );
  }

  /** Emit raw signals (used by `getNovuContext().trigger` / `.setMetadata`). */
  async emitSignals(threadId: string, signals: Signal[]): Promise<void> {
    const decoded = decodeThreadId(threadId);
    await this.replyClient.send(this.replyPayload(decoded, { signals }));
    await this.patchSnapshotAfterSignals(threadId, signals);
  }

  /** Emit a resolve (used by `getNovuContext().resolve`). */
  async emitResolve(threadId: string, summary?: string): Promise<void> {
    const decoded = decodeThreadId(threadId);
    await this.replyClient.send(this.replyPayload(decoded, { resolve: { summary } }));

    const snapshot = await this.getSnapshot(threadId);
    if (snapshot) {
      await this.saveSnapshot(threadId, patchSnapshotResolved(snapshot));
    }
  }

  renderFormatted(content: FormattedContent): string {
    return this.stringifyMarkdown(content);
  }

  // -- Thread metadata --

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    const snapshot = await this.getSnapshot(threadId);
    const decoded = decodeThreadId(threadId);

    return {
      id: threadId,
      channelId: channelIdFromThreadId(threadId),
      isDM: decoded.isDM,
      metadata: snapshot
        ? {
            conversationId: snapshot.conversation.identifier,
            status: snapshot.conversation.status,
            platform: snapshot.platform,
            ...snapshot.conversation.metadata,
          }
        : {
            conversationId: decoded.conversationId,
            platform: decoded.platform,
          },
    };
  }

  async fetchMessages(threadId: string, options: FetchOptions = {}): Promise<FetchResult<NovuRawMessage>> {
    const snapshot = await this.getSnapshot(threadId);
    if (!snapshot) {
      return { messages: [] };
    }
    const decoded = decodeThreadId(threadId);
    const allMessages = snapshot.history.map((entry, index) =>
      this.mapper.buildHistoryMessage(entry, index, threadId, decoded.integrationIdentifier, decoded.platform)
    );

    return paginateHistoryMessages(allMessages, options);
  }

  /** Cached bridge snapshot for a thread (single source for NovuContext reads). */
  async getSnapshot(threadId: string): Promise<ThreadSnapshot | null> {
    return this.state().get<ThreadSnapshot>(snapshotKey(threadId));
  }

  /**
   * SDK-native user lookup. Resolves the Novu subscriber indexed by id (the
   * inbound author's `userId` is the `subscriberId`) and maps it to the
   * portable `UserInfo` shape. Returns `null` for unknown ids. Novu-specific
   * fields (`phone`, `locale`, `data`) are not part of `UserInfo` — use
   * `getNovuContext(thread).getSubscriber()` for those.
   */
  async getUser(userId: string): Promise<UserInfo | null> {
    const subscriber = await this.state().get<AgentSubscriber>(subscriberKey(userId));
    if (!subscriber) {
      return null;
    }
    const fullName = [subscriber.firstName, subscriber.lastName].filter(Boolean).join(' ');

    return {
      userId: subscriber.subscriberId,
      userName: subscriber.subscriberId,
      fullName: fullName || subscriber.subscriberId,
      email: subscriber.email,
      avatarUrl: subscriber.avatar,
      isBot: false,
    };
  }

  // -- Unsupported / no-op operations --

  async startTyping(): Promise<void> {
    // Novu routes the reply when it is ready; there is no typing channel.
  }

  async removeReaction(): Promise<void> {
    // Novu's reply API only supports adding reactions.
  }

  async deleteMessage(): Promise<void> {
    throw new NotImplementedError('deleteMessage');
  }

  // -- helpers --

  private async saveSnapshot(threadId: string, snapshot: ThreadSnapshot): Promise<void> {
    await this.state().set(snapshotKey(threadId), snapshot, SNAPSHOT_TTL_MS);
  }

  private async patchSnapshotAfterSignals(threadId: string, signals: Signal[]): Promise<void> {
    const snapshot = await this.getSnapshot(threadId);
    if (!snapshot) {
      return;
    }

    const patched = patchSnapshotFromSignals(snapshot, signals);
    if (patched) {
      await this.saveSnapshot(threadId, patched);
    }
  }

  private replyPayload(decoded: NovuThreadId, rest: Partial<AgentReplyPayload>): AgentReplyPayload {
    return {
      conversationId: decoded.conversationId,
      integrationIdentifier: decoded.integrationIdentifier,
      ...rest,
    };
  }

  private outboundRaw(decoded: NovuThreadId, messageId: string): NovuRawMessage {
    return {
      id: messageId,
      text: '',
      author: {
        userId: this.userName,
        userName: this.userName,
        fullName: this.userName,
        isBot: true,
      },
      timestamp: new Date().toISOString(),
      conversationId: decoded.conversationId,
      integrationIdentifier: decoded.integrationIdentifier,
      platform: decoded.platform,
    };
  }

  private emojiName(emoji: EmojiValue | string): string {
    if (typeof emoji === 'string') {
      return emoji;
    }

    return emoji?.name ?? String(emoji);
  }
}
