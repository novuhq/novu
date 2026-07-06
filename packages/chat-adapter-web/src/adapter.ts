import { randomUUID } from 'node:crypto';
import type {
  Adapter,
  AdapterPostableMessage,
  ChatInstance,
  EmojiValue,
  FetchResult,
  FormattedContent,
  Message,
  RawMessage,
  Root,
  ThreadInfo,
  WebhookOptions,
} from 'chat';
import { buildWebStreamChannel, decodeWebThreadId, encodeWebThreadId, webChannelIdFromThreadId } from './thread-id.js';
import type {
  NovuWebAdapterConfig,
  NovuWebRawMessage,
  NovuWebThreadId,
  WebFileRef,
  WebMessageContent,
  WebOutboundEvent,
} from './types.js';

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not supported by the web adapter`);
    this.name = 'NotImplementedError';
  }
}

type MessageConstructor = new (data: unknown) => Message<NovuWebRawMessage>;

/**
 * Chat SDK adapter for Novu's web chat channel.
 *
 * Transport-inverted: unlike platform adapters that call an external API,
 * outbound methods publish serialized events to a Redis pub/sub channel. The
 * api-service instance holding the browser's open SSE stream subscribes to
 * that channel and pumps the events down as AI SDK data-stream frames, so
 * replies arriving on any instance reach whichever instance owns the socket.
 */
export class NovuWebAdapterImpl implements Adapter<NovuWebThreadId, NovuWebRawMessage> {
  readonly name = 'web';
  readonly userName: string;
  /**
   * The SDK persists per-thread transcripts in the state adapter (Redis) —
   * the web platform has no server-side history API of its own.
   */
  readonly persistThreadHistory = true;

  private readonly config: NovuWebAdapterConfig;
  private chat: ChatInstance | null = null;
  private MessageClass!: MessageConstructor;
  private parseMarkdownFn!: (md: string) => Root;
  private stringifyMarkdownFn!: (ast: Root) => string;

  constructor(config: NovuWebAdapterConfig) {
    this.config = config;
    this.userName = config.agentName ?? 'web-agent';
  }

  async initialize(chat: ChatInstance): Promise<void> {
    this.chat = chat;

    const chatModule = await import('chat');
    this.MessageClass = chatModule.Message as unknown as MessageConstructor;
    this.parseMarkdownFn = chatModule.parseMarkdown;
    this.stringifyMarkdownFn = chatModule.stringifyMarkdown;
  }

  // -- Thread ID methods --

  encodeThreadId(data: NovuWebThreadId): string {
    return encodeWebThreadId(data);
  }

  decodeThreadId(threadId: string): NovuWebThreadId {
    return decodeWebThreadId(threadId);
  }

  channelIdFromThreadId(threadId: string): string {
    return webChannelIdFromThreadId(threadId);
  }

  isDM(_threadId: string): boolean {
    return true;
  }

  // -- Inbound --

  /**
   * The web platform never enters through the public webhook route: inbound
   * messages are subscriber-JWT authenticated POSTs dispatched natively via
   * `chat.processMessage()` (see InboundDispatcher.processWebMessage).
   */
  async handleWebhook(_request: Request, _options?: WebhookOptions): Promise<Response> {
    throw new NotImplementedError('handleWebhook');
  }

  parseMessage(raw: NovuWebRawMessage): Message<NovuWebRawMessage> {
    if (!this.MessageClass || !this.parseMarkdownFn) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    const dateSent = new Date(raw.createdAt);

    return new this.MessageClass({
      id: raw.id,
      threadId: '',
      text: raw.text,
      formatted: this.parseMarkdownFn(raw.text),
      raw,
      author: {
        userId: raw.subscriberId,
        userName: raw.subscriberId,
        fullName: raw.senderName ?? raw.subscriberId,
        isBot: false,
        isMe: false,
      },
      metadata: {
        dateSent: Number.isNaN(dateSent.getTime()) ? new Date() : dateSent,
        edited: false,
      },
      attachments: [],
      // Web chat is always a direct conversation with the agent: the first
      // message must fire onNewMention (which auto-subscribes the thread), and
      // subsequent ones flow through onSubscribedMessage.
      isMention: true,
    });
  }

  // -- Outbound (publish to relay) --

  async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage<NovuWebRawMessage>> {
    const content = this.normalizeContent(message);
    const messageId = this.mintMessageId();

    await this.publishEvent(threadId, { kind: 'message', messageId, content, ts: Date.now() });

    return { id: messageId, raw: this.toOutboundRaw(threadId, messageId, content), threadId };
  }

  async editMessage(
    threadId: string,
    messageId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<NovuWebRawMessage>> {
    const content = this.normalizeContent(message);

    await this.publishEvent(threadId, { kind: 'edit', messageId, content, ts: Date.now() });

    return { id: messageId, raw: this.toOutboundRaw(threadId, messageId, content), threadId };
  }

  async deleteMessage(threadId: string, messageId: string): Promise<void> {
    await this.publishEvent(threadId, { kind: 'delete', messageId, ts: Date.now() });
  }

  async startTyping(threadId: string, status?: string): Promise<void> {
    await this.publishEvent(threadId, { kind: 'typing', status: status ?? '', ts: Date.now() });
  }

  async addReaction(threadId: string, messageId: string, emoji: EmojiValue | string): Promise<void> {
    await this.publishEvent(threadId, {
      kind: 'reaction',
      messageId,
      emoji: this.toEmojiName(emoji),
      added: true,
      ts: Date.now(),
    });
  }

  async removeReaction(threadId: string, messageId: string, emoji: EmojiValue | string): Promise<void> {
    await this.publishEvent(threadId, {
      kind: 'reaction',
      messageId,
      emoji: this.toEmojiName(emoji),
      added: false,
      ts: Date.now(),
    });
  }

  // -- Rendering --

  renderFormatted(content: FormattedContent): string {
    return this.stringifyMarkdownFn(content);
  }

  // -- Thread metadata --

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    const decoded = decodeWebThreadId(threadId);

    return {
      id: threadId,
      channelId: this.channelIdFromThreadId(threadId),
      metadata: {
        subscriberId: decoded.subscriberId,
        conversationId: decoded.conversationId,
        agentName: this.config.agentName,
      },
    };
  }

  /** History is served from Novu's ConversationActivity store, not the adapter. */
  async fetchMessages(_threadId: string): Promise<FetchResult<NovuWebRawMessage>> {
    return { messages: [] };
  }

  /** Server-initiated conversation with a subscriber (proactive DM). */
  async openDM(subscriberId: string): Promise<string> {
    return encodeWebThreadId({ subscriberId, conversationId: randomUUID() });
  }

  // -- Internals --

  private mintMessageId(): string {
    return `web-${randomUUID()}`;
  }

  private async publishEvent(threadId: string, event: WebOutboundEvent): Promise<void> {
    const channel = buildWebStreamChannel(this.config.channelPrefix, threadId);
    await this.config.publish(channel, JSON.stringify(event));
  }

  private toOutboundRaw(threadId: string, messageId: string, content: WebMessageContent): NovuWebRawMessage {
    const decoded = decodeWebThreadId(threadId);

    return {
      id: messageId,
      subscriberId: decoded.subscriberId,
      conversationId: decoded.conversationId,
      text: content.markdown ?? '',
      senderName: this.config.agentName,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Normalize AdapterPostableMessage variants into the relay content shape.
   * The outbound gateway sends `{ markdown, files? }` or `{ card, files? }`;
   * plain strings, `{ raw }`, `{ ast }` and bare CardElements arrive from
   * internal thread replies (capacity cards, plan-limit cards, acks).
   */
  private normalizeContent(message: AdapterPostableMessage): WebMessageContent {
    if (typeof message === 'string') {
      return { markdown: message };
    }

    const files = this.extractFiles(message);

    if ('markdown' in message) {
      return { markdown: (message as { markdown: string }).markdown, ...(files && { files }) };
    }
    if ('raw' in message) {
      return { markdown: (message as { raw: string }).raw, ...(files && { files }) };
    }
    if ('ast' in message) {
      return { markdown: this.stringifyMarkdownFn((message as { ast: Root }).ast), ...(files && { files }) };
    }
    if ('card' in message) {
      return { card: (message as unknown as { card: Record<string, unknown> }).card, ...(files && { files }) };
    }
    if ('type' in message) {
      return { card: message as unknown as Record<string, unknown>, ...(files && { files }) };
    }

    return { ...(files && { files }) };
  }

  /**
   * Binary payloads never travel over the relay: the host's file materializer
   * resolves web-bound files to URL refs before delivery, so anything still
   * carrying only a Buffer here is dropped.
   */
  private extractFiles(message: object): WebFileRef[] | undefined {
    const candidates = (message as { files?: unknown }).files;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return undefined;
    }

    const files = candidates.flatMap((file): WebFileRef[] => {
      if (!file || typeof file !== 'object') {
        return [];
      }

      const { url, filename, name, mimeType, size } = file as {
        url?: unknown;
        filename?: unknown;
        name?: unknown;
        mimeType?: unknown;
        size?: unknown;
      };

      if (typeof url !== 'string' || !url) {
        return [];
      }

      return [
        {
          url,
          ...(typeof filename === 'string' ? { filename } : typeof name === 'string' ? { filename: name } : {}),
          ...(typeof mimeType === 'string' && { mimeType }),
          ...(typeof size === 'number' && { size }),
        },
      ];
    });

    return files.length > 0 ? files : undefined;
  }

  private toEmojiName(emoji: EmojiValue | string): string {
    if (typeof emoji === 'string') {
      return emoji;
    }

    if (emoji && typeof emoji === 'object' && 'name' in emoji && typeof emoji.name === 'string') {
      return emoji.name;
    }

    return String(emoji);
  }
}
