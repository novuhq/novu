import type { Message } from 'chat';
import type { NovuEmailRawMessage } from './types.js';
import { extractDisplayName, parseEmailAddress, stripHtml } from './utils.js';

type MessageConstructor = new (data: unknown) => Message<NovuEmailRawMessage>;
type ParseMarkdownFn = (text: string) => import('chat').Root;

/**
 * Converts raw email data into a Chat SDK Message.
 * Requires chat SDK classes injected via setChatModule() since `chat` is ESM-only.
 */
export class MessageParser {
  private MessageClass: MessageConstructor | null = null;
  private parseMarkdownFn: ParseMarkdownFn | null = null;

  setChatModule(MessageClass: MessageConstructor, parseMarkdownFn: ParseMarkdownFn): void {
    this.MessageClass = MessageClass;
    this.parseMarkdownFn = parseMarkdownFn;
  }

  parse(raw: NovuEmailRawMessage, fromAddress: string): Message<NovuEmailRawMessage> {
    if (!this.MessageClass || !this.parseMarkdownFn) {
      throw new Error('MessageParser not initialized — call setChatModule() first');
    }

    const authorEmail = parseEmailAddress(raw.from);
    const authorName = extractDisplayName(raw.from);
    const text = raw.text || stripHtml(raw.html || '');
    const mappedAuthor = {
      userId: authorEmail,
      userName: authorEmail,
      fullName: authorName,
      isBot: false,
      isMe: authorEmail === fromAddress,
    };
    const mappedMetadata = {
      dateSent: (() => {
        const d = new Date(raw.createdAt);
        return Number.isNaN(d.getTime()) ? new Date() : d;
      })(),
      edited: false,
    };
    const mappedAttachments = (raw.attachments || []).flatMap(
      (a: {
        filename: string;
        contentType: string;
        size?: number;
        contentBase64?: string;
        truncated?: boolean;
        url?: string;
      }) => {
        if (a.truncated) {
          return [];
        }

        return [
          {
            type: 'file' as const,
            name: a.filename,
            mimeType: a.contentType,
            size: a.size,
            ...(a.contentBase64 ? { data: Buffer.from(a.contentBase64, 'base64') } : {}),
            ...(a.url ? { url: a.url } : {}),
          },
        ];
      }
    );

    return new this.MessageClass({
      id: raw.id,
      threadId: '',
      text,
      formatted: this.parseMarkdownFn(text),
      raw,
      author: mappedAuthor,
      metadata: mappedMetadata,
      attachments: mappedAttachments,
      isMention: true,
    });
  }
}
