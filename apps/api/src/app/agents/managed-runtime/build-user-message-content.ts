import type { PinoLogger } from '@novu/application-generic';
import { type ContentPart, type Message, MessageRole } from '@novu/thalamus';
import type { StoredAttachment } from '../conversation-runtime/conversation/agent-attachment-storage.service';

/**
 * Media types Claude can consume natively as vision / document content.
 * Anything outside these sets is dropped from the model turn (the file is still
 * stored and referenced elsewhere) so the request never trips an Anthropic 400.
 */
const IMAGE_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const PDF_MEDIA_TYPE = 'application/pdf';

/**
 * Anthropic-safe budgets applied before base64-encoding. Base64 inflates raw
 * bytes by ~33%, and the whole request must stay under the API's ~32 MB limit,
 * so the aggregate budget is deliberately conservative. Over-budget files are
 * skipped (warned), never fatal.
 */
const MAX_MEDIA_FILES = 15;
const MAX_MEDIA_BYTES_PER_FILE = 10 * 1024 * 1024;
const MAX_AGGREGATE_MEDIA_BYTES = 20 * 1024 * 1024;

export interface BuildUserMessageContentParams {
  userMessageText: string;
  attachments?: StoredAttachment[];
  /** Reads raw object bytes for a storageKey; returns null when missing. */
  getBytes: (storageKey: string) => Promise<Buffer | null>;
  logger?: Pick<PinoLogger, 'warn'>;
}

/** Lowercase the media type and strip any `; charset=…` parameters. */
function normalizeMediaType(mimeType?: string): string | undefined {
  if (!mimeType) {
    return undefined;
  }

  const normalized = mimeType.split(';')[0]?.trim().toLowerCase();

  return normalized || undefined;
}

/**
 * Build the content for the current user turn. When the turn carries inbound
 * image/PDF attachments, they are inlined as base64 Thalamus content parts
 * (files first, then the text — Anthropic recommends image-then-text). Returns
 * the plain text string when there are no usable attachments, preserving the
 * previous text-only behavior.
 */
export async function buildUserMessageContent(params: BuildUserMessageContentParams): Promise<string | ContentPart[]> {
  const { userMessageText, attachments, getBytes, logger } = params;

  if (!attachments?.length) {
    return userMessageText;
  }

  const mediaParts: ContentPart[] = [];
  let aggregateBytes = 0;

  for (const attachment of attachments) {
    if (mediaParts.length >= MAX_MEDIA_FILES) {
      logger?.warn(
        { cap: MAX_MEDIA_FILES, name: attachment.name },
        'Skipping inbound attachment over media count cap for model turn'
      );
      break;
    }

    const mediaType = normalizeMediaType(attachment.mimeType);
    const isImage = mediaType !== undefined && IMAGE_MEDIA_TYPES.has(mediaType);
    const isPdf = mediaType === PDF_MEDIA_TYPE;

    if (!isImage && !isPdf) {
      logger?.warn(
        { mimeType: attachment.mimeType, name: attachment.name },
        'Skipping inbound attachment with unsupported media type for model turn'
      );
      continue;
    }

    if (attachment.size != null && attachment.size > MAX_MEDIA_BYTES_PER_FILE) {
      logger?.warn(
        { size: attachment.size, cap: MAX_MEDIA_BYTES_PER_FILE, name: attachment.name },
        'Skipping inbound attachment over per-file size cap for model turn'
      );
      continue;
    }

    let bytes: Buffer | null;
    try {
      bytes = await getBytes(attachment.storageKey);
    } catch (err) {
      logger?.warn(err, 'Failed to read inbound attachment bytes; omitting from model turn');
      continue;
    }

    if (!bytes) {
      logger?.warn({ name: attachment.name }, 'Inbound attachment missing from storage; omitting from model turn');
      continue;
    }

    if (bytes.length > MAX_MEDIA_BYTES_PER_FILE) {
      logger?.warn(
        { byteLength: bytes.length, cap: MAX_MEDIA_BYTES_PER_FILE, name: attachment.name },
        'Skipping inbound attachment over per-file size cap after read for model turn'
      );
      continue;
    }

    if (aggregateBytes + bytes.length > MAX_AGGREGATE_MEDIA_BYTES) {
      logger?.warn(
        { byteLength: bytes.length, aggregateBytes, cap: MAX_AGGREGATE_MEDIA_BYTES, name: attachment.name },
        'Skipping inbound attachment over aggregate media budget for model turn'
      );
      continue;
    }

    aggregateBytes += bytes.length;
    const data = bytes.toString('base64');

    if (isImage && mediaType !== undefined) {
      mediaParts.push({ type: 'image', data, mediaType });
    } else {
      mediaParts.push({
        type: 'file',
        data,
        mediaType: PDF_MEDIA_TYPE,
        ...(attachment.name ? { name: attachment.name } : {}),
      });
    }
  }

  if (!mediaParts.length) {
    return userMessageText;
  }

  const parts: ContentPart[] = [...mediaParts];

  if (userMessageText.trim()) {
    parts.push({ type: 'text', text: userMessageText });
  }

  return parts;
}

/**
 * Replace the content of the most recent USER row with the resolved turn body.
 * Used for the new-session path, where history is collapsed to text first and
 * only the current turn's files are attached. A plain-string body (no usable
 * attachments) leaves the collapsed messages untouched.
 */
export function applyUserContentToLatestUserTurn(messages: Message[], userContent: string | ContentPart[]): Message[] {
  if (typeof userContent === 'string') {
    return messages;
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === MessageRole.USER) {
      messages[i] = { ...messages[i], content: userContent };
      break;
    }
  }

  return messages;
}

function contentText(content: Message['content']): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function hasNonTextParts(content: Message['content']): boolean {
  return Array.isArray(content) && content.some((part) => part.type !== 'text');
}

/**
 * Thalamus `packUserMessage` keeps image/file parts only when the USER row has
 * no preceding ASSISTANT/SYSTEM context in the same send. Otherwise it
 * `toText()`s the user content and Claude never sees the file.
 *
 * When the current USER turn carries media, fold any preceding rows into a
 * trailing text part so the send is a single USER message.
 */
export function preserveMediaThroughThalamusPacking(messages: Message[]): Message[] {
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === MessageRole.USER) {
      lastUserIndex = i;
      break;
    }
  }

  if (lastUserIndex <= 0) {
    return messages;
  }

  const userMessage = messages[lastUserIndex];
  if (!hasNonTextParts(userMessage.content)) {
    return messages;
  }

  const contextText = messages
    .slice(0, lastUserIndex)
    .map((message) => contentText(message.content).trim())
    .filter((text) => text.length > 0)
    .join('\n\n');
  const userParts = userMessage.content as ContentPart[];
  const mediaParts = userParts.filter((part) => part.type !== 'text');
  const userText = userParts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
  const combinedText = [contextText, userText].filter((text) => text.trim().length > 0).join('\n\n');
  const content: ContentPart[] = [...mediaParts];

  if (combinedText) {
    content.push({ type: 'text', text: combinedText });
  }

  return [{ role: MessageRole.USER, content }, ...messages.slice(lastUserIndex + 1)];
}
