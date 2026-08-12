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
  WebChatRawMessage,
  WebChatRequestBody,
  WebChatSession,
  WebChatThreadId,
} from './types.js';
import {
  ADAPTER_NAME,
  conversationIdFromThreadId,
  isApprovalActionId,
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

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

type IngressKind =
  | { type: 'message'; text: string }
  | { type: 'action'; actionId: string; sourceMessageId?: string; value?: string };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/**
 * Telegram/WhatsApp-style demux: thin `handleWebhook` → private ingress
 * handlers that call `processMessage` / `processAction`.
 */
export class NovuWebChatAdapterImpl implements Adapter<WebChatThreadId, WebChatRawMessage> {
  readonly name = ADAPTER_NAME;
  readonly userName: string;
  readonly persistMessageHistory = false;
  readonly persistThreadHistory = false;
  readonly lockScope = 'thread' as const;
  /**
   * Capability flag: callers may embed a `messageId` in the postable message
   * and this adapter will use it as the platform message id (idempotent posts).
   */
  readonly supportsClientMessageIds = true;

  private readonly config: WebChatAdapterConfig;
  private chat: ChatInstance | null = null;
  private MessageClass: MessageConstructor | null = null;
  private parseMarkdownFn: ((md: string) => Root) | null = null;

  constructor(config: WebChatAdapterConfig) {
    this.config = config;
    this.userName = config.userName ?? 'web-chat-agent';
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

    const session = await this.verifySession(request);
    if (session instanceof Response) {
      return session;
    }

    const body = await this.parseRequestBody(request);
    if (body instanceof Response) {
      return body;
    }

    const kind = this.resolveIngressKind(body);
    if (kind instanceof Response) {
      return kind;
    }

    switch (kind.type) {
      case 'message':
        return this.handleMessageIngress(kind, session, body, options);
      case 'action':
        return this.handleActionIngress(kind, session, body, options);
      default: {
        const _exhaustive: never = kind;

        return _exhaustive;
      }
    }
  }

  /** Auth edge — same role as Slack signature / Telegram secret token checks. */
  private async verifySession(request: Request): Promise<WebChatSession | Response> {
    try {
      const session = await this.config.verifySession(request);
      if (!session) {
        return jsonResponse({ message: 'Unauthorized' }, 401);
      }

      return session;
    } catch (err) {
      console.error('[chat-adapter-web] verifySession threw', err);

      return jsonResponse({ message: 'Unauthorized' }, 401);
    }
  }

  private async parseRequestBody(request: Request): Promise<WebChatRequestBody | Response> {
    try {
      return (await request.json()) as WebChatRequestBody;
    } catch {
      return jsonResponse({ message: 'Invalid JSON body' }, 400);
    }
  }

  /** Exactly one of `text` | `actionId` (WhatsApp-style type demux). */
  private resolveIngressKind(body: WebChatRequestBody): IngressKind | Response {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const actionId = typeof body.actionId === 'string' ? body.actionId.trim() : '';
    const hasText = text.length > 0;
    const hasAction = actionId.length > 0;

    if (hasText && hasAction) {
      return jsonResponse({ message: 'Provide exactly one of text or actionId' }, 400);
    }

    if (hasText) {
      return { type: 'message', text };
    }

    if (!hasAction) {
      return jsonResponse({ message: 'text or actionId is required' }, 400);
    }

    const sourceMessageId = typeof body.sourceMessageId === 'string' ? body.sourceMessageId.trim() : '';
    if (!isApprovalActionId(actionId) && !sourceMessageId) {
      return jsonResponse({ message: 'sourceMessageId is required with actionId' }, 400);
    }

    const value = typeof body.value === 'string' ? body.value : undefined;

    return {
      type: 'action',
      actionId,
      ...(sourceMessageId ? { sourceMessageId } : {}),
      value,
    };
  }

  private async handleMessageIngress(
    kind: Extract<IngressKind, { type: 'message' }>,
    session: WebChatSession,
    body: WebChatRequestBody,
    options?: WebhookOptions
  ): Promise<Response> {
    const resumeId = this.resolveResumeConversationId(body);
    if (resumeId === 'invalid') {
      return jsonResponse({ message: 'Invalid conversation id' }, 400);
    }

    let conversationId: string;
    if (resumeId) {
      const allowed = this.config.authorizeResume
        ? await this.config.authorizeResume({ conversationId: resumeId, session })
        : false;
      if (!allowed) {
        return jsonResponse({ message: 'Conversation not found' }, 404);
      }

      const blocked = await this.checkAcceptLimits(session, false, resumeId);
      if (blocked) {
        return blocked;
      }

      conversationId = resumeId;
    } else {
      const blocked = await this.checkAcceptLimits(session, true);
      if (blocked) {
        return blocked;
      }

      conversationId = mintConversationId();
    }

    // Always mint message ids. Client `messageId` idempotency would ack a ghost
    // turn if checked before durable create; keep server-minted ids for now.
    const threadId = this.encodeThreadId({ conversationId });
    const messageId = mintMessageId();
    const message = this.parseMessage({
      id: messageId,
      text: kind.text,
      subscriberId: session.subscriberId,
      createdAt: new Date().toISOString(),
      contextKeys: session.contextKeys ?? [],
    });

    this.chat!.processMessage(this, threadId, message, options);

    // Public conversation identifier stays bare `conv_*`; chat-sdk thread ids are
    // `web_chat:conv_*` so `chat.thread()` can resolve this adapter by prefix.
    // `messageId` lets the client reconcile optimistic bubbles with history/live.
    return jsonResponse({ data: { identifier: conversationId, messageId } }, 201);
  }

  /** Button / approval click — mirrors Telegram `handleCallbackQuery`. */
  private async handleActionIngress(
    kind: Extract<IngressKind, { type: 'action' }>,
    session: WebChatSession,
    body: WebChatRequestBody,
    options?: WebhookOptions
  ): Promise<Response> {
    const conversationId = await this.resolveConversationId(body, session, { requireExisting: true });
    if (conversationId instanceof Response) {
      return conversationId;
    }

    const blocked = await this.checkAcceptLimits(session, false, conversationId);
    if (blocked) {
      return blocked;
    }

    const threadId = this.encodeThreadId({ conversationId });
    const user = {
      userId: session.subscriberId,
      userName: session.subscriberId,
      fullName: session.subscriberId,
      isBot: false,
      isMe: false,
    };

    this.chat!.processAction(
      {
        adapter: this,
        actionId: kind.actionId,
        value: kind.value,
        // Chat ActionEvent requires messageId; headless approvals have no card carrier.
        messageId: kind.sourceMessageId ?? '',
        threadId,
        user,
        raw: { ...body, contextKeys: session.contextKeys ?? [] },
      },
      options
    );

    return jsonResponse({ data: { identifier: conversationId } }, 200);
  }

  /** Sync plan-limit gate before minting or dispatching. */
  private async checkAcceptLimits(
    session: WebChatSession,
    isNewThread: boolean,
    conversationId?: string
  ): Promise<Response | null> {
    if (!this.config.checkAcceptLimits) {
      return null;
    }

    const block = await this.config.checkAcceptLimits({ session, isNewThread, conversationId });
    if (!block) {
      return null;
    }

    return jsonResponse({ reason: block.reason, message: block.message }, 402);
  }

  /**
   * Resolve / mint conversation id + resume ACL.
   * Actions always require an existing conversation (no mint).
   */
  private async resolveConversationId(
    body: WebChatRequestBody,
    session: WebChatSession,
    opts: { requireExisting: boolean }
  ): Promise<string | Response> {
    const resumeId = this.resolveResumeConversationId(body);
    if (resumeId === 'invalid') {
      return jsonResponse({ message: 'Invalid conversation id' }, 400);
    }

    if (!resumeId) {
      if (opts.requireExisting) {
        return jsonResponse({ message: 'conversationIdentifier is required for actions' }, 400);
      }

      return mintConversationId();
    }

    const allowed = this.config.authorizeResume
      ? await this.config.authorizeResume({ conversationId: resumeId, session })
      : false;
    if (!allowed) {
      return jsonResponse({ message: 'Conversation not found' }, 404);
    }

    return resumeId;
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
    const { content, richContent, messageId } = parsePostableMessage(message);
    const delivered = await this.config.deliverMessage({ threadId, content, richContent, messageId });

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

  /** No-status typing → delivery emits an ephemeral `channel.typing` state=off. */
  async stopTyping(threadId: string): Promise<void> {
    await this.config.startTyping({ threadId });
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
