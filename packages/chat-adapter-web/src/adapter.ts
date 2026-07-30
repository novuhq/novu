import { AsyncLocalStorage } from 'node:async_hooks';
import type {
  Adapter,
  AdapterPostableMessage,
  ChatInstance,
  FetchResult,
  FormattedContent,
  Message,
  RawMessage,
  Root,
  ThreadInfo,
  WebhookOptions,
} from 'chat';
import type {
  WebChatAdapterConfig,
  WebChatEventContext,
  WebChatRawMessage,
  WebChatRequestBody,
  WebChatThreadId,
} from './types.js';
import {
  ADAPTER_NAME,
  conversationIdFromThreadId,
  isValidConversationId,
  mintActivityId,
  mintConversationId,
  mintMessageId,
  parsePostableMessage,
  toThreadId,
} from './utils.js';

class NotImplementedError extends Error {
  constructor(method: string, reason: string) {
    super(`${method} is not supported by the web chat adapter: ${reason}`);
    this.name = 'NotImplementedError';
  }
}

type MessageConstructor = new (data: unknown) => Message<WebChatRawMessage>;

const eventContextStorage = new AsyncLocalStorage<WebChatEventContext>();

export class NovuWebChatAdapterImpl implements Adapter<WebChatThreadId, WebChatRawMessage> {
  readonly name = ADAPTER_NAME;
  readonly userName: string;
  readonly persistMessageHistory = false;
  readonly persistThreadHistory = false;
  readonly lockScope = 'thread' as const;

  private readonly config: WebChatAdapterConfig;
  private chat: ChatInstance | null = null;
  private MessageClass: MessageConstructor | null = null;
  private parseMarkdownFn: ((md: string) => Root) | null = null;

  constructor(config: WebChatAdapterConfig) {
    this.config = config;
    this.userName = config.userName ?? 'web-chat-agent';
  }

  /**
   * Carry a source runtime envelope (or Nest factory inputs) through post /
   * edit / delete / typing. Uses AsyncLocalStorage so concurrent turns do not
   * cross-contaminate context.
   */
  withEventContext<T>(context: WebChatEventContext, operation: () => T | Promise<T>): T | Promise<T> {
    return NovuWebChatAdapterImpl.withEventContext(context, operation);
  }

  static withEventContext<T>(context: WebChatEventContext, operation: () => T | Promise<T>): T | Promise<T> {
    return eventContextStorage.run(context, operation);
  }

  static getEventContext(): WebChatEventContext | undefined {
    return eventContextStorage.getStore();
  }

  getEventContext(): WebChatEventContext | undefined {
    return NovuWebChatAdapterImpl.getEventContext();
  }

  async initialize(chat: ChatInstance): Promise<void> {
    this.chat = chat;
    const chatModule = await import('chat');
    this.MessageClass = chatModule.Message as unknown as MessageConstructor;
    this.parseMarkdownFn = chatModule.parseMarkdown;
  }

  encodeThreadId(data: WebChatThreadId): string {
    return toThreadId(data.conversationId);
  }

  decodeThreadId(threadId: string): WebChatThreadId {
    const conversationId = conversationIdFromThreadId(threadId);
    if (!isValidConversationId(conversationId)) {
      throw new Error(`Invalid web chat thread id: ${threadId}`);
    }

    return { conversationId };
  }

  channelIdFromThreadId(threadId: string): string {
    return threadId;
  }

  isDM(_threadId: string): boolean {
    return true;
  }

  async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
    if (!this.chat) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    let session;
    try {
      session = await this.config.verifySession(request);
    } catch (err) {
      console.error('[chat-adapter-web] verifySession threw', err);

      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (!session) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    let body: WebChatRequestBody;
    try {
      body = (await request.json()) as WebChatRequestBody;
    } catch {
      return new Response(JSON.stringify({ message: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return new Response(JSON.stringify({ message: 'text is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const resumeId = this.resolveResumeConversationId(body);
    if (resumeId === 'invalid') {
      return new Response(JSON.stringify({ message: 'Invalid conversation id' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    let conversationId: string;
    if (resumeId) {
      const allowed = this.config.authorizeResume
        ? await this.config.authorizeResume({ conversationId: resumeId, session })
        : false;
      if (!allowed) {
        return new Response(JSON.stringify({ message: 'Conversation not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      conversationId = resumeId;
    } else {
      conversationId = mintConversationId();
    }

    // Always mint message ids. Client `messageId` idempotency would ack a ghost
    // turn if checked before durable create; keep server-minted ids for now.
    const threadId = this.encodeThreadId({ conversationId });
    const messageId = mintMessageId();
    const raw: WebChatRawMessage = {
      id: messageId,
      text,
      subscriberId: session.subscriberId,
      createdAt: new Date().toISOString(),
    };
    const message = this.parseMessage(raw);

    // Provision before ack so the room is addressable even if a later gate blocks.
    if (this.config.provisionInbound) {
      await this.config.provisionInbound({
        conversationId,
        threadId,
        messageId,
        text,
        session,
      });
    }

    this.chat.processMessage(this, threadId, message, options);

    // Public conversation identifier stays bare `conv_*`; chat-sdk thread ids are
    // `web_chat:conv_*` so `chat.thread()` can resolve this adapter by prefix.
    return new Response(JSON.stringify({ data: { identifier: conversationId } }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }

  /** Prefer `conversationIdentifier`, fall back to `id`. */
  private resolveResumeConversationId(body: WebChatRequestBody): string | null | 'invalid' {
    const raw =
      body.conversationIdentifier !== undefined && body.conversationIdentifier !== null
        ? body.conversationIdentifier
        : body.id !== undefined && body.id !== null
          ? body.id
          : null;

    if (raw === null) {
      return null;
    }
    if (typeof raw !== 'string' || !isValidConversationId(raw)) {
      return 'invalid';
    }

    return raw;
  }

  parseMessage(raw: WebChatRawMessage): Message<WebChatRawMessage> {
    if (!this.MessageClass || !this.parseMarkdownFn) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    return new this.MessageClass({
      id: raw.id,
      threadId: '',
      text: raw.text,
      formatted: this.parseMarkdownFn(raw.text),
      raw,
      author: {
        userId: raw.subscriberId,
        userName: raw.subscriberId,
        fullName: raw.subscriberId,
        isBot: false,
        isMe: false,
      },
      metadata: {
        dateSent: new Date(raw.createdAt),
        edited: false,
      },
      attachments: [],
      isMention: true,
    });
  }

  async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage<WebChatRawMessage>> {
    const { content, richContent } = parsePostableMessage(message);
    const delivered = await this.config.deliverMessage({ threadId, content, richContent });

    return {
      id: delivered.id,
      threadId: delivered.threadId,
      raw: {
        id: delivered.id,
        text: content,
        subscriberId: '',
        createdAt: new Date().toISOString(),
      },
    };
  }

  async editMessage(
    threadId: string,
    messageId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<WebChatRawMessage>> {
    const { content, richContent } = parsePostableMessage(message);
    const edited = await this.config.editMessage({ threadId, messageId, content, richContent });

    return {
      id: edited.id,
      threadId: edited.threadId,
      raw: {
        id: edited.id,
        text: content,
        subscriberId: '',
        createdAt: new Date().toISOString(),
      },
    };
  }

  async deleteMessage(threadId: string, messageId: string): Promise<void> {
    await this.config.deleteMessage({ threadId, messageId });
  }

  async startTyping(threadId: string, status?: string): Promise<void> {
    await this.config.startTyping({ threadId, status });
  }

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    return {
      id: threadId,
      channelId: threadId,
      metadata: { title: 'Web chat' },
    };
  }

  async fetchMessages(_threadId: string): Promise<FetchResult<WebChatRawMessage>> {
    return { messages: [] };
  }

  renderFormatted(content: FormattedContent): string {
    if (!this.parseMarkdownFn) {
      return '';
    }

    // Formatted content is already markdown-derived; callers that need a string
    // use the markdown they passed to postMessage. Keep a minimal escape hatch.
    return typeof content === 'object' ? '' : String(content);
  }

  async openDM(_userId: string): Promise<string> {
    return this.encodeThreadId({ conversationId: mintConversationId() });
  }

  async addReaction(_threadId: string, _messageId: string, _emoji: unknown): Promise<void> {
    throw new NotImplementedError('addReaction', 'web chat has no platform reaction API');
  }

  async removeReaction(_threadId: string, _messageId: string, _emoji: string): Promise<void> {
    throw new NotImplementedError('removeReaction', 'web chat has no platform reaction API');
  }

  /** Stable id helper for Nest callbacks that only need a platform message id. */
  static mintActivityId(): string {
    return mintActivityId();
  }
}
