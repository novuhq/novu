import type {
  AdapterPostableMessage,
  Attachment,
  Author,
  CardElement,
  Message as ChatMessage,
  MessageData,
  Root,
} from 'chat';
import type {
  AgentAttachment,
  AgentHistoryEntry,
  AgentMessage,
  AgentMessageAuthor,
  NovuRawMessage,
  ReplyContent,
} from './types.js';

const ATTACHMENT_TYPES = new Set(['image', 'file', 'video', 'audio']);

/** Chat-module functions the mapper needs, injected after the dynamic `import('chat')`. */
export interface ChatModuleParts {
  Message: new <T = unknown>(data: MessageData<T>) => ChatMessage<T>;
  parseMarkdown: (md: string) => Root;
  stringifyMarkdown: (ast: Root) => string;
  toCardElement: (element: unknown) => CardElement;
  isCardElement: (value: unknown) => value is CardElement;
}

export class MessageMapper {
  private parts!: ChatModuleParts;

  setChatModule(parts: ChatModuleParts): void {
    this.parts = parts;
  }

  // -- inbound: bridge -> chat --

  toRawMessage(
    message: AgentMessage,
    ctx: { conversationId: string; integrationIdentifier: string; platform: string }
  ): NovuRawMessage {
    return {
      id: message.platformMessageId,
      text: message.text,
      author: message.author,
      timestamp: message.timestamp,
      attachments: message.attachments,
      conversationId: ctx.conversationId,
      integrationIdentifier: ctx.integrationIdentifier,
      platform: ctx.platform,
    };
  }

  /**
   * Build a chat `Message`. `isMention` is forced `true`: Novu only bridges
   * messages already directed at the agent, so first-message routing must reach
   * `onNewMention` (for channel messages) rather than being dropped.
   *
   * `authorOverride` lets the adapter present the Novu subscriber as the message
   * author (so `author.userId === subscriberId` and `adapter.getUser(userId)`
   * resolves). The platform-native author is preserved on `message.raw.author`.
   */
  buildMessage(
    raw: NovuRawMessage,
    threadId: string,
    authorOverride?: AgentMessageAuthor
  ): ChatMessage<NovuRawMessage> {
    const dateSent = parseDate(raw.timestamp);

    return new this.parts.Message<NovuRawMessage>({
      id: raw.id,
      threadId,
      text: raw.text,
      formatted: this.parts.parseMarkdown(raw.text ?? ''),
      raw,
      author: this.toAuthor(authorOverride ?? raw.author),
      metadata: { dateSent, edited: false },
      attachments: (raw.attachments ?? []).map(toChatAttachment),
      isMention: true,
    });
  }

  /** Build a chat `Message` from a history entry (used by `fetchMessages`). */
  buildHistoryMessage(
    entry: AgentHistoryEntry,
    index: number,
    threadId: string,
    integrationIdentifier: string,
    platform: string
  ): ChatMessage<NovuRawMessage> {
    const isAssistant = entry.role === 'assistant' || entry.role === 'system';
    const raw: NovuRawMessage = {
      id: `novu-history:${index}`,
      text: entry.content,
      author: {
        userId: isAssistant ? 'novu-agent' : 'novu-subscriber',
        fullName: entry.senderName ?? (isAssistant ? 'Agent' : 'User'),
        userName: entry.senderName ?? entry.role,
        isBot: isAssistant,
      },
      timestamp: entry.createdAt,
      conversationId: '',
      integrationIdentifier,
      platform,
    };

    return new this.parts.Message<NovuRawMessage>({
      id: raw.id,
      threadId,
      text: entry.content,
      formatted: this.parts.parseMarkdown(entry.content ?? ''),
      raw,
      author: this.toAuthor(raw.author, isAssistant),
      metadata: { dateSent: parseDate(entry.createdAt), edited: false },
      attachments: [],
    });
  }

  toAuthor(author: AgentMessageAuthor, isMe = false): Author {
    return {
      userId: author.userId,
      userName: author.userName,
      fullName: author.fullName,
      isBot: author.isBot,
      isMe,
    };
  }

  // -- outbound: AdapterPostableMessage -> ReplyContent --

  toReplyContent(message: AdapterPostableMessage): ReplyContent {
    if (typeof message === 'string') {
      return { markdown: message };
    }
    if (this.parts.isCardElement(message)) {
      return { card: message };
    }
    if (typeof message === 'object' && message !== null) {
      const obj = message as unknown as Record<string, unknown>;
      if (typeof obj.markdown === 'string') {
        return { markdown: obj.markdown };
      }
      if (typeof obj.raw === 'string') {
        return { markdown: obj.raw };
      }
      if (obj.ast) {
        return { markdown: this.parts.stringifyMarkdown(obj.ast as Root) };
      }
      if (obj.card !== undefined) {
        return { card: this.toCard(obj.card) };
      }
      if (obj.type !== undefined) {
        return { card: this.toCard(message) };
      }
    }

    throw new Error('Unsupported message content passed to Novu adapter');
  }

  private toCard(value: unknown): CardElement {
    return this.parts.isCardElement(value) ? value : this.parts.toCardElement(value);
  }
}

function parseDate(value: string | undefined): Date {
  if (!value) {
    return new Date(0);
  }
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function toChatAttachment(att: AgentAttachment): Attachment {
  const type = normalizeAttachmentType(att.type, att.mimeType);

  return {
    type,
    url: att.url,
    name: att.name,
    mimeType: att.mimeType,
    size: att.size,
  };
}

function normalizeAttachmentType(type: string | undefined, mimeType: string | undefined): Attachment['type'] {
  if (type && ATTACHMENT_TYPES.has(type)) {
    return type as Attachment['type'];
  }
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';

  return 'file';
}
