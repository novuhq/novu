import type { Emoji } from 'chat';
import { isJSX, toCardElement } from 'chat/jsx-runtime';
import { AgentDeliveryError } from './agent.errors';
import type {
  AddReactionPayload,
  AgentAction,
  AgentBridgeRequest,
  AgentContext,
  AgentConversation,
  AgentHistoryEntry,
  AgentMessage,
  AgentPlatformContext,
  AgentReaction,
  AgentReplyPayload,
  AgentSubscriber,
  FileRef,
  MessageContent,
  ReplyContent,
  ReplyHandle,
  SentMessageInfo,
  Signal,
  TriggerRecipientsPayload,
} from './agent.types';

const MAX_INLINE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_AGGREGATE_FILE_BYTES = 5 * 1024 * 1024;
const CHUNK_SIZE = 0x8000;
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

function isCardElement(content: object): content is import('chat').CardElement {
  return 'type' in content && (content as { type: string }).type === 'card';
}

function describeFile(file: FileRef, index: number): string {
  return file.filename ? `"${file.filename}"` : `at index ${index}`;
}

function getGlobalBuffer() {
  return (
    globalThis as typeof globalThis & {
      Buffer?: {
        isBuffer?: (value: unknown) => boolean;
        from: (value: ArrayBuffer | Uint8Array) => { toString: (encoding: 'base64') => string };
      };
    }
  ).Buffer;
}

function isBuffer(value: unknown): value is Buffer {
  return getGlobalBuffer()?.isBuffer?.(value) ?? false;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function bytesToBase64(bytes: Uint8Array): string {
  const globalBuffer = getGlobalBuffer();
  if (globalBuffer) {
    return globalBuffer.from(bytes).toString('base64');
  }

  if (typeof btoa !== 'function') {
    throw new Error('Unable to encode file data: base64 encoding is not available in this runtime.');
  }

  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function decodedBase64Length(value: string): number | null {
  const normalized = value.replace(/\s/g, '');
  const remainder = normalized.length % 4;

  if (!normalized || remainder === 1 || !BASE64_REGEX.test(normalized)) {
    return null;
  }

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;

  return Math.floor((normalized.length * 3) / 4) - padding;
}

function assertInlineFileSize(size: number, file: FileRef, index: number): void {
  if (size > MAX_INLINE_FILE_BYTES) {
    throw new Error(
      `Invalid file ${describeFile(file, index)}: inline data must be 5 MB or smaller. ` +
        'Use a publicly-accessible URL for larger files.'
    );
  }
}

async function encodeFileData(data: NonNullable<FileRef['data']>, file: FileRef, index: number): Promise<string> {
  if (typeof data === 'string') {
    const decodedLength = decodedBase64Length(data);
    if (decodedLength === null) {
      throw new Error(`Invalid file ${describeFile(file, index)}: data must be a base64-encoded string.`);
    }

    assertInlineFileSize(decodedLength, file, index);

    return data;
  }

  if (isBuffer(data)) {
    assertInlineFileSize(data.byteLength, file, index);

    return data.toString('base64');
  }

  if (data instanceof Uint8Array) {
    assertInlineFileSize(data.byteLength, file, index);

    return bytesToBase64(data);
  }

  if (data instanceof ArrayBuffer) {
    assertInlineFileSize(data.byteLength, file, index);

    return bytesToBase64(new Uint8Array(data));
  }

  if (isBlob(data)) {
    assertInlineFileSize(data.size, file, index);

    return bytesToBase64(new Uint8Array(await data.arrayBuffer()));
  }

  throw new Error(
    `Invalid file ${describeFile(file, index)}: data must be a base64 string, Buffer, Uint8Array, ArrayBuffer, or Blob.`
  );
}

async function validateFiles(files?: FileRef[]): Promise<FileRef[] | undefined> {
  if (!files?.length) {
    return undefined;
  }

  const normalized: FileRef[] = [];
  let inlineAggregateSize = 0;

  for (const [index, file] of files.entries()) {
    const data = (file as { data?: unknown }).data;
    const url = (file as { url?: unknown }).url;
    const hasData = data !== undefined && data !== null;
    const hasUrl = url !== undefined && url !== null;

    if (hasData === hasUrl) {
      throw new Error(`Invalid file ${describeFile(file, index)}: provide exactly one of data or url.`);
    }

    if (hasData) {
      const encodedData = await encodeFileData(data as NonNullable<FileRef['data']>, file, index);
      const decodedLength = decodedBase64Length(encodedData);
      inlineAggregateSize += decodedLength ?? 0;

      if (inlineAggregateSize > MAX_INLINE_AGGREGATE_FILE_BYTES) {
        throw new Error(
          `Invalid files: total inline data must be 5 MB or smaller. Use publicly-accessible URLs for larger files.`
        );
      }

      normalized.push({
        ...file,
        data: encodedData,
      });

      continue;
    }

    if (hasUrl && typeof url !== 'string') {
      throw new Error(`Invalid file ${describeFile(file, index)}: url must be a string.`);
    }

    normalized.push(file);
  }

  return normalized;
}

async function serializeContent(content: MessageContent, files?: FileRef[]): Promise<ReplyContent> {
  const validFiles = await validateFiles(files);

  if (typeof content === 'string') {
    return validFiles ? { markdown: content, files: validFiles } : { markdown: content };
  }

  if (isJSX(content)) {
    const card = toCardElement(content);
    if (card) {
      return { card };
    }
  }

  if (isCardElement(content)) {
    return { card: content };
  }

  throw new Error('Invalid message content — expected string or CardElement');
}

interface ReplyPoster {
  post(body: AgentReplyPayload): Promise<SentMessageInfo | null>;
}

class ReplyHandleImpl implements ReplyHandle {
  public messageId: string;
  public platformThreadId: string;

  constructor(
    messageId: string,
    platformThreadId: string,
    private readonly conversationId: string,
    private readonly integrationIdentifier: string,
    private readonly poster: ReplyPoster
  ) {
    this.messageId = messageId;
    this.platformThreadId = platformThreadId;
  }

  async edit(content: MessageContent, options?: { files?: FileRef[] }): Promise<ReplyHandle> {
    const info = await this.poster.post({
      conversationId: this.conversationId,
      integrationIdentifier: this.integrationIdentifier,
      edit: {
        messageId: this.messageId,
        content: await serializeContent(content, options?.files),
      },
    });

    if (!info) {
      throw new Error('Agent edit did not return a message handle');
    }

    // Mutate-in-place: the handle represents the same platform message, so we refresh
    // ids from the edit response (Slack/Teams preserve them; other platforms may not)
    // and return `this` to honour the "same handle for chaining" contract.
    this.messageId = info.messageId;
    this.platformThreadId = info.platformThreadId;

    return this;
  }
}

export class AgentContextImpl implements AgentContext {
  readonly event: string;
  readonly action: AgentAction | null;
  readonly message: AgentMessage | null;
  readonly reaction: AgentReaction | null;
  readonly conversation: AgentConversation;
  readonly subscriber: AgentSubscriber | null;
  readonly history: AgentHistoryEntry[];
  readonly platform: string;
  readonly platformContext: AgentPlatformContext;

  readonly metadata: { set: (key: string, value: unknown) => void };

  private _signals: Signal[] = [];
  private _pendingReactions: AddReactionPayload[] = [];
  private _resolveSignal: { summary?: string } | null = null;
  private readonly _replyUrl: string;
  private readonly _conversationId: string;
  private readonly _integrationIdentifier: string;
  private readonly _secretKey: string;
  private readonly _poster: ReplyPoster;

  constructor(request: AgentBridgeRequest, secretKey: string) {
    this.event = request.event;
    this.action = request.action ?? null;
    this.message = request.message;
    this.reaction = request.reaction;
    this.conversation = request.conversation;
    this.subscriber = request.subscriber;
    this.history = request.history;
    this.platform = request.platform;
    this.platformContext = request.platformContext;

    this._replyUrl = request.replyUrl;
    this._conversationId = request.conversationId;
    this._integrationIdentifier = request.integrationIdentifier;
    this._secretKey = secretKey;
    this._poster = { post: (body) => this._post(body) };

    this.metadata = {
      set: (key: string, value: unknown) => {
        this._signals.push({ type: 'metadata', key, value });
      },
    };
  }

  async reply(content: MessageContent, options?: { files?: FileRef[] }): Promise<ReplyHandle> {
    const body: AgentReplyPayload = {
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
      reply: await serializeContent(content, options?.files),
    };

    if (this._signals.length) {
      body.signals = this._signals;
      this._signals = [];
    }

    if (this._pendingReactions.length) {
      body.addReactions = this._pendingReactions;
      this._pendingReactions = [];
    }

    if (this._resolveSignal) {
      body.resolve = this._resolveSignal;
      this._resolveSignal = null;
    }

    const info = await this._post(body);
    if (!info) {
      throw new Error('Agent reply did not return a message handle');
    }

    return new ReplyHandleImpl(
      info.messageId,
      info.platformThreadId,
      this._conversationId,
      this._integrationIdentifier,
      this._poster
    );
  }

  resolve(summary?: string): void {
    this._resolveSignal = { summary };
  }

  trigger(workflowId: string, opts?: { to?: TriggerRecipientsPayload; payload?: Record<string, unknown> }): void {
    this._signals.push({ ...opts, type: 'trigger', workflowId });
  }

  addReaction(messageId: string, emojiName: Emoji): void {
    this._pendingReactions.push({ messageId, emojiName });
  }

  /**
   * Flush any remaining signals that weren't sent with reply().
   * Called internally after onResolve returns.
   */
  async flush(): Promise<void> {
    if (!this._signals.length && !this._resolveSignal && !this._pendingReactions.length) {
      return;
    }

    const body: AgentReplyPayload = {
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
    };

    if (this._signals.length) {
      body.signals = this._signals;
      this._signals = [];
    }

    if (this._pendingReactions.length) {
      body.addReactions = this._pendingReactions;
      this._pendingReactions = [];
    }

    if (this._resolveSignal) {
      body.resolve = this._resolveSignal;
      this._resolveSignal = null;
    }

    await this._post(body);
  }

  private async _post(body: AgentReplyPayload): Promise<SentMessageInfo | null> {
    const response = await fetch(this._replyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${this._secretKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AgentDeliveryError(response.status, text);
    }

    const raw = await response.text().catch(() => '');
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { data?: Record<string, unknown> } | Record<string, unknown>;
      const envelope = (parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed) as
        | Record<string, unknown>
        | undefined;

      if (envelope && typeof envelope.messageId === 'string' && typeof envelope.platformThreadId === 'string') {
        return { messageId: envelope.messageId, platformThreadId: envelope.platformThreadId };
      }
    } catch {
      // flush-only responses return null or an empty body; tolerate and fall through.
    }

    return null;
  }
}
