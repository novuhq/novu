import { randomUUID } from 'node:crypto';
import type {
  Adapter,
  AdapterPostableMessage,
  CardElement,
  ChatInstance,
  FetchResult,
  FormattedContent,
  Message,
  RawMessage,
  Root,
  ThreadInfo,
} from 'chat';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { esmImport } from '../shared/util/esm-import';
import type { GeContent } from './a2a-mapping';
import type { GeBusEvent } from './gemini-enterprise-turn-bus.service';

export const GE_ADAPTER_NAME = AgentPlatformEnum.GEMINI_ENTERPRISE;
const THREAD_ID_PREFIX = `${GE_ADAPTER_NAME}:`;

export const geThreadId = (contextId: string) => `${THREAD_ID_PREFIX}${contextId}`;

export function contextIdFromGeThreadId(threadId: string): string {
  return threadId.startsWith(THREAD_ID_PREFIX) ? threadId.slice(THREAD_ID_PREFIX.length) : threadId;
}

export type GeRawMessage = { id: string; text: string; subscriberId: string };

export interface GeminiEnterpriseAdapterConfig {
  userName: string;
  /** Hands a delivery to whichever pod holds Gemini Enterprise's open stream for this thread. */
  publish: (threadId: string, event: GeBusEvent) => Promise<void>;
}

type MessageConstructor = new (data: unknown) => Message<GeRawMessage>;

/**
 * Chat SDK adapter for Gemini Enterprise (A2A). Inbound arrives through the dedicated streaming
 * ingress, not `handleWebhook`; outbound is published to the turn bus instead of calling a platform API,
 * because the only way to answer Gemini Enterprise is on the SSE response it holds open.
 */
export class GeminiEnterpriseAdapter implements Adapter<{ contextId: string }, GeRawMessage> {
  readonly name = GE_ADAPTER_NAME;
  readonly userName: string;
  readonly persistMessageHistory = false;
  readonly persistThreadHistory = false;
  readonly lockScope = 'thread' as const;

  private MessageClass: MessageConstructor | null = null;
  private parseMarkdownFn: ((md: string) => Root) | null = null;
  private stringifyMarkdownFn: ((ast: Root) => string) | null = null;

  constructor(private readonly config: GeminiEnterpriseAdapterConfig) {
    this.userName = config.userName;
  }

  async initialize(_chat: ChatInstance): Promise<void> {
    const chatModule = await esmImport('chat');
    this.MessageClass = chatModule.Message;
    this.parseMarkdownFn = chatModule.parseMarkdown;
    this.stringifyMarkdownFn = chatModule.stringifyMarkdown;
  }

  encodeThreadId({ contextId }: { contextId: string }): string {
    return geThreadId(contextId);
  }

  decodeThreadId(threadId: string): { contextId: string } {
    return { contextId: contextIdFromGeThreadId(threadId) };
  }

  channelIdFromThreadId(threadId: string): string {
    return threadId;
  }

  isDM(_threadId: string): boolean {
    return true;
  }

  async handleWebhook(_request: Request): Promise<Response> {
    return new Response(JSON.stringify({ message: 'Use the Gemini Enterprise A2A endpoint' }), { status: 404 });
  }

  parseMessage(raw: GeRawMessage): Message<GeRawMessage> {
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
      metadata: { dateSent: new Date(), edited: false },
      attachments: [],
      isMention: true,
    });
  }

  async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage<GeRawMessage>> {
    const id = randomUUID();
    const content = this.toContent(message);
    await this.config.publish(threadId, { type: 'post', messageId: id, content });

    return this.rawMessage(id, threadId, content);
  }

  async editMessage(
    threadId: string,
    messageId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<GeRawMessage>> {
    const content = this.toContent(message);
    await this.config.publish(threadId, { type: 'edit', messageId, content });

    return this.rawMessage(messageId, threadId, content);
  }

  /** Gemini Enterprise has no way to retract a sent answer. */
  async deleteMessage(_threadId: string, _messageId: string): Promise<void> {}

  async startTyping(threadId: string, status?: string): Promise<void> {
    await this.config.publish(threadId, { type: 'typing', status });
  }

  /** Gemini Enterprise has no reactions; the inbound ack reaction must not fail the turn. */
  async addReaction(): Promise<void> {}

  async removeReaction(): Promise<void> {}

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    return { id: threadId, channelId: threadId, metadata: { title: 'Gemini Enterprise' } };
  }

  async fetchMessages(_threadId: string): Promise<FetchResult<GeRawMessage>> {
    return { messages: [] };
  }

  renderFormatted(content: FormattedContent): string {
    return this.stringifyMarkdownFn ? this.stringifyMarkdownFn(content) : '';
  }

  private toContent(message: AdapterPostableMessage): GeContent {
    if (typeof message === 'string') return { text: message };
    if ('type' in message && message.type === 'card') return { card: message as CardElement };
    if ('card' in message) return { card: message.card };
    if ('markdown' in message) return { text: message.markdown };
    if ('raw' in message) return { text: message.raw };
    if ('ast' in message) return { text: this.renderFormatted(message.ast) };

    return { text: '' };
  }

  private rawMessage(id: string, threadId: string, content: GeContent): RawMessage<GeRawMessage> {
    return { id, threadId, raw: { id, text: 'text' in content ? content.text : '', subscriberId: '' } };
  }
}
