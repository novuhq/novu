import type {
  AdapterPostableMessage,
  Attachment,
  Author,
  CardElement,
  Message as ChatMessage,
  MessageData,
  Root,
} from 'chat';
import { mapReplyFiles } from './reply-files.js';
import type {
  AgentAttachment,
  AgentHistoryEntry,
  AgentMessage,
  AgentMessageAuthor,
  NovuRawMessage,
  ReplyContent,
} from './types.js';

const ATTACHMENT_TYPES = new Set(['image', 'file', 'video', 'audio']);

/** The object forms of `AdapterPostableMessage` (strings and card elements are handled first). */
type PostableObjectMessage = Exclude<AdapterPostableMessage, string | CardElement>;

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
    ctx: {
      conversationId: string;
      integrationIdentifier: string;
      platform: string;
    }
  ): NovuRawMessage {
    return {
      id: message.platformMessageId,
      text: message.text,
      ...(message.markdown !== undefined ? { markdown: message.markdown } : {}),
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
   *
   * `formatted` is parsed from the bridge's GFM `markdown` when present, so platform
   * structure (e.g. Slack table blocks) survives as mdast nodes; plain `text` is the fallback.
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
      formatted: this.parts.parseMarkdown(raw.markdown ?? raw.text ?? ''),
      raw,
      author: this.toAuthor(authorOverride ?? raw.author),
      metadata: { dateSent, edited: false },
      attachments: (raw.attachments ?? []).map(toChatAttachment),
      isMention: true,
    });
  }

  /**
   * Build a chat `Message` from a Novu history entry (used by `fetchMessages`).
   * Preserves `role`, `type`, `richContent`, and `signalData` on `message.raw.history`
   * and maps signed attachments from `richContent.attachments` when present.
   */
  buildHistoryMessage(
    entry: AgentHistoryEntry,
    index: number,
    threadId: string,
    integrationIdentifier: string,
    platform: string
  ): ChatMessage<NovuRawMessage> {
    const isAssistant = entry.role === 'assistant' || entry.role === 'system';
    const historyAttachments = attachmentsFromRichContent(entry.richContent);
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
      attachments: historyAttachments,
      conversationId: '',
      integrationIdentifier,
      platform,
      history: {
        role: entry.role,
        type: entry.type,
        richContent: entry.richContent,
        signalData: entry.signalData,
      },
    };

    return new this.parts.Message<NovuRawMessage>({
      id: raw.id,
      threadId,
      text: entry.content,
      formatted: this.parts.parseMarkdown(entry.content ?? ''),
      raw,
      author: this.toAuthor(raw.author, isAssistant),
      metadata: { dateSent: parseDate(entry.createdAt), edited: false },
      attachments: historyAttachments.map(toChatAttachment),
    });
  }

  toAuthor(author: AgentMessageAuthor, isMe = false): Author {
    return {
      userId: author.userId,
      userName: author.userName,
      fullName: author.fullName,
      isBot: author.isBot,
      isMe,
      ...(author.email ? { email: author.email } : {}),
      ...(author.isSystem ? { isSystem: true } : {}),
    };
  }

  // -- outbound: AdapterPostableMessage -> ReplyContent --

  async toReplyContent(message: AdapterPostableMessage): Promise<ReplyContent> {
    if (typeof message === 'string') {
      return { markdown: message };
    }
    if (this.parts.isCardElement(message)) {
      return { card: message };
    }

    const files = await mapReplyFiles(message.files ?? ('attachments' in message ? message.attachments : undefined));
    const body = this.toReplyBody(message);

    return files ? { ...body, files } : body;
  }

  private toReplyBody(message: PostableObjectMessage): ReplyContent {
    if ('markdown' in message && typeof message.markdown === 'string') {
      return { markdown: message.markdown };
    }
    if ('raw' in message && typeof message.raw === 'string') {
      return { markdown: message.raw };
    }
    if ('ast' in message && message.ast) {
      return { markdown: this.parts.stringifyMarkdown(message.ast) };
    }
    if ('card' in message && message.card !== undefined) {
      return { card: this.toCard(message.card) };
    }
    // A card element that failed `isCardElement` (e.g. JSON-revived) still normalizes via `toCardElement`.
    if ('type' in message && message.type === 'card') {
      return { card: this.toCard(message) };
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

function attachmentsFromRichContent(richContent?: Record<string, unknown>): AgentAttachment[] {
  const raw = richContent?.attachments;
  if (!Array.isArray(raw)) {
    return [];
  }

  const attachments: AgentAttachment[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const att = item as Record<string, unknown>;
    attachments.push({
      type: typeof att.type === 'string' ? att.type : 'file',
      url: typeof att.url === 'string' ? att.url : undefined,
      name: typeof att.name === 'string' ? att.name : undefined,
      mimeType: typeof att.mimeType === 'string' ? att.mimeType : undefined,
      size: typeof att.size === 'number' ? att.size : undefined,
    });
  }

  return attachments;
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
