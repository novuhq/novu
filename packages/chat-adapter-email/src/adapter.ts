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
import type { CardNode } from './card-renderer.js';
import { EmailFormatConverter } from './format-converter.js';
import { MessageParser } from './message-parser.js';
import { renderMessage } from './message-renderer.js';
import { ThreadResolver } from './thread-resolver.js';
import type { NovuEmailAdapterConfig, NovuEmailRawMessage, NovuEmailThreadId } from './types.js';
import { generateMessageId, hashMessageId, parseEmailAddress } from './utils.js';
import { WebhookHandler } from './webhook-handler.js';

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not supported by the email adapter`);
    this.name = 'NotImplementedError';
  }
}

export class NovuEmailAdapterImpl implements Adapter<NovuEmailThreadId, NovuEmailRawMessage> {
  readonly name = 'email';
  readonly userName: string;
  readonly persistMessageHistory = true;

  private readonly config: NovuEmailAdapterConfig;
  private chat: ChatInstance | null = null;
  private readonly threadResolver = new ThreadResolver();
  private readonly messageParser = new MessageParser();
  private readonly formatConverter = new EmailFormatConverter();
  private readonly webhookHandler: WebhookHandler;
  private parseMarkdownFn!: (md: string) => Root;

  constructor(config: NovuEmailAdapterConfig) {
    this.config = config;
    this.userName = config.senderName ?? 'email-agent';
    this.webhookHandler = new WebhookHandler(config.signingSecret);
  }

  async initialize(chat: ChatInstance): Promise<void> {
    this.chat = chat;
    this.threadResolver.setStateAdapter(chat.getState());

    const chatModule = await import('chat');
    this.parseMarkdownFn = chatModule.parseMarkdown;
    this.messageParser.setChatModule(chatModule.Message as any, chatModule.parseMarkdown);
  }

  // -- Thread ID methods --

  encodeThreadId(data: NovuEmailThreadId): string {
    return this.threadResolver.encodeThreadId(data);
  }

  decodeThreadId(threadId: string): NovuEmailThreadId {
    return this.threadResolver.decodeThreadId(threadId);
  }

  channelIdFromThreadId(threadId: string): string {
    const { recipientAddress } = this.threadResolver.decodeThreadId(threadId);

    return `email:${recipientAddress}`;
  }

  // -- Inbound --

  async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
    if (!this.chat) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    const result = await this.webhookHandler.parseAndVerify(request);
    if (!result.payload) {
      return new Response(null, { status: result.status });
    }

    const { payload } = result;
    const senderAddress = parseEmailAddress(payload.from.address);

    const threadId = await this.threadResolver.resolveThreadId({
      recipientAddress: senderAddress,
      messageId: payload.messageId,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
    });

    const agentAddress = payload.to[0]?.address;
    await Promise.all([
      this.threadResolver.trackSubject(threadId, payload.subject),
      agentAddress ? this.threadResolver.trackAgentAddress(threadId, agentAddress) : Promise.resolve(),
    ]);

    const message = this.parseMessage(this.toRawMessage(payload, threadId));
    this.chat.processMessage(this, threadId, message, options);

    return new Response(null, { status: 200 });
  }

  private toRawMessage(payload: import('./types.js').EmailWebhookPayload, _threadId: string): NovuEmailRawMessage {
    return {
      id: payload.messageId,
      messageId: payload.messageId,
      from: payload.from.name ? `${payload.from.name} <${payload.from.address}>` : payload.from.address,
      to: payload.to.map((t: { address: string; name?: string }) => t.address),
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      createdAt: payload.date,
      attachments: payload.attachments,
    };
  }

  // -- Message parsing --

  parseMessage(raw: NovuEmailRawMessage): Message<NovuEmailRawMessage> {
    const agentAddress = raw.to[0] ?? '';

    return this.messageParser.parse(raw, agentAddress);
  }

  // -- Outbound --

  async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage<NovuEmailRawMessage>> {
    const normalized = this.normalizeMessage(message);
    const decoded = this.threadResolver.decodeThreadId(threadId);
    const rendered = await renderMessage(normalized);

    const agentAddress = await this.threadResolver.getAgentAddress(threadId);
    if (!agentAddress) {
      throw new Error(`No agent address found for thread ${threadId} — cannot determine From address for reply`);
    }

    const fromHeader = this.config.senderName
      ? `${this.config.senderName} <${agentAddress}>`
      : agentAddress;

    const messageId = generateMessageId(agentAddress);
    const replyHeaders = await this.threadResolver.getReplyHeaders(threadId);
    const storedSubject = await this.threadResolver.getSubject(threadId);
    const subject = storedSubject
      ? /^re:/i.test(storedSubject)
        ? storedSubject
        : `Re: ${storedSubject}`
      : 'New message';

    const result = await this.config.sendEmail({
      from: agentAddress,
      to: decoded.recipientAddress,
      subject,
      html: rendered.html,
      text: rendered.text,
      messageId,
      inReplyTo: replyHeaders?.['In-Reply-To'],
      references: replyHeaders?.References,
    });

    const sentMessageId = result.messageId || messageId;
    await this.threadResolver.trackMessage(threadId, sentMessageId);

    const raw: NovuEmailRawMessage = {
      id: sentMessageId,
      messageId: sentMessageId,
      from: fromHeader,
      to: [decoded.recipientAddress],
      subject,
      text: rendered.text,
      html: rendered.html,
      headers: replyHeaders,
      createdAt: new Date().toISOString(),
    };

    return { id: sentMessageId, raw, threadId };
  }

  /**
   * Normalize AdapterPostableMessage variants into a uniform shape.
   */
  private normalizeMessage(message: AdapterPostableMessage): { text?: string; formatted?: Root; card?: CardNode } {
    if (typeof message === 'string') {
      return { text: message };
    }
    if ('markdown' in message) {
      const md = (message as { markdown: string }).markdown;
      const formatted = this.parseMarkdownFn(md);

      return { formatted, text: md };
    }
    if ('raw' in message) {
      return { text: (message as { raw: string }).raw };
    }
    if ('ast' in message) {
      return { formatted: (message as { ast: Root }).ast };
    }
    if ('card' in message) {
      return { card: (message as { card: CardNode }).card };
    }
    if ('type' in message) {
      return { card: message as CardNode };
    }

    return message as { text?: string; formatted?: Root; card?: CardNode };
  }

  // -- Rendering --

  renderFormatted(content: FormattedContent): string {
    return this.formatConverter.fromAst(content);
  }

  // -- Thread metadata --

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    const decoded = this.threadResolver.decodeThreadId(threadId);
    const subject = await this.threadResolver.getSubject(threadId);

    return {
      id: threadId,
      channelId: this.channelIdFromThreadId(threadId),
      metadata: {
        title: subject || `Conversation with ${decoded.recipientAddress}`,
        recipientAddress: decoded.recipientAddress,
      },
    };
  }

  async fetchMessages(_threadId: string): Promise<FetchResult<NovuEmailRawMessage>> {
    return { messages: [] };
  }

  async openDM(email: string): Promise<string> {
    const messageId = generateMessageId(email);
    const hash = hashMessageId(messageId);

    return this.threadResolver.encodeThreadId({
      recipientAddress: email,
      rootMessageIdHash: hash,
    });
  }

  // -- Unsupported operations --

  async startTyping(_threadId: string): Promise<void> {
    // No-op: email has no typing indicators
  }

  async editMessage(
    _threadId: string,
    _messageId: string,
    _message: AdapterPostableMessage
  ): Promise<RawMessage<NovuEmailRawMessage>> {
    throw new NotImplementedError('editMessage');
  }

  async deleteMessage(_threadId: string, _messageId: string): Promise<void> {
    throw new NotImplementedError('deleteMessage');
  }

  async addReaction(_threadId: string, _messageId: string, _emoji: string): Promise<void> {
    throw new NotImplementedError('addReaction');
  }

  async removeReaction(_threadId: string, _messageId: string, _emoji: string): Promise<void> {
    throw new NotImplementedError('removeReaction');
  }
}
