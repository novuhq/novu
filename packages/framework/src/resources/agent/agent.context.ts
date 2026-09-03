import type { AgentEvent, AgentFileRef, AgentMessageContent, AgentRunOutcome } from '@novu/agent-event-protocol';
import type { Emoji } from 'chat';
import { AgentDeliveryError } from './agent.errors';
import { type AgentRuntimeContext, RUNTIME_CONTEXT_BRAND } from './agent.runtime';
import type {
  AddReactionPayload,
  AgentAction,
  AgentBridgeRequest,
  AgentContextPayload,
  AgentConversation,
  AgentHistoryEntry,
  AgentHumanResponse,
  AgentMessage,
  AgentMessageContext,
  AgentNotification,
  AgentPlatformContext,
  AgentReaction,
  AgentReplyPayload,
  AgentSubscriber,
  AgentToolCall,
  DeleteMessagePayload,
  FileRef,
  HumanAskApproveOptions,
  HumanChooseOptions,
  HumanTellOptions,
  MessageContent,
  PendingApproval as PendingApprovalType,
  ReplyContent,
  ReplyHandle,
  SentMessageInfo,
  Signal,
  ToolApprovalCard,
  ToolApprovalConfig,
  ToolApprovalControl,
  ToolResult,
  TriggerRecipientsPayload,
  TypingControl,
  TypingOp,
} from './agent.types';
import { AgentEventEnum, PendingApproval } from './agent.types';
import { AgentEventOutbox } from './agent-event-outbox';
import { normalizeHumanTo } from './human-to';
import { resolveCardContent } from './resolve-card-content';
import type { ToolApprovalRequestPayload } from './tool-approval/action-id';
import { postToolApprovalCard } from './tool-approval/post-card';

const MAX_INLINE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_AGGREGATE_FILE_BYTES = 5 * 1024 * 1024;
const CHUNK_SIZE = 0x8000;
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

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

  const card = await resolveCardContent(content);
  if (card) {
    return validFiles ? { card, files: validFiles } : { card };
  }

  throw new Error('Invalid message content — expected string or CardElement');
}

function mint(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * `ReplyContent['card']` is Chat SDK `CardElement`. `AgentMessageContent['card']` is the
 * Novu-owned protocol `CardElement`. This is the one place that crosses that authoring
 * → wire boundary for outbound card content.
 */
function toAgentMessageContent(reply: ReplyContent): AgentMessageContent {
  if (reply.markdown !== undefined) {
    return { markdown: reply.markdown };
  }

  if (reply.card !== undefined) {
    return { card: reply.card };
  }

  throw new Error('Invalid reply content — expected markdown or card');
}

function toAgentFileRefs(files?: FileRef[]): AgentFileRef[] | undefined {
  if (!files?.length) {
    return undefined;
  }

  return files.map((file, index) => ({
    fileId: file.filename || `file_${index}`,
    name: file.filename,
    mediaType: file.mimeType,
    ...(file.data !== undefined ? { data: typeof file.data === 'string' ? file.data : undefined } : {}),
    ...(file.url !== undefined ? { url: file.url } : {}),
  }));
}

/** Pending side effects queued between replies, drained atomically before each turn action. */
interface SideEffectsSnapshot {
  toolApprovalRequest: ToolApprovalRequestPayload | null;
  signals: Signal[];
  toolResults: ToolResult[];
  addReactions: AddReactionPayload[];
  deleteMessages: DeleteMessagePayload[];
  resolve: { summary?: string } | null;
}

/**
 * A turn's delivery mechanism. Legacy bridges POST a single `AgentReplyPayload` per action;
 * SDK-native runs emit one or more `AgentEvent`s to the outbox. `AgentContextImpl` selects one
 * implementation per run and delegates to it, instead of branching on the mode at every call site.
 */
interface TurnTransport {
  sendReply(reply: ReplyContent, sideEffects: SideEffectsSnapshot): Promise<SentMessageInfo | null>;
  /**
   * Returns `'unaddressable'` when the card was rendered but there is no client-addressable
   * message handle for it (event mode: the sink owns approval-card rendering, so there is no
   * id it could later resolve an edit/delete against).
   */
  sendApprovalCard(
    card: ToolApprovalCard,
    sideEffects: SideEffectsSnapshot
  ): Promise<SentMessageInfo | null | 'unaddressable'>;
  editMessage(messageId: string, reply: ReplyContent): Promise<SentMessageInfo | null>;
  deleteMessage(messageId: string): Promise<void>;
  setTyping(op: TypingOp): Promise<void>;
  flushSideEffects(sideEffects: SideEffectsSnapshot): Promise<void>;
  emitCustom(name: string, data: unknown): Promise<void>;
  queueRunStart(): void;
  emitRunFinish(outcome: AgentRunOutcome): Promise<void>;
  reportTurnError(message?: string): Promise<void>;
}

function applySideEffects(body: AgentReplyPayload, sideEffects: SideEffectsSnapshot): void {
  if (sideEffects.toolApprovalRequest) {
    body.toolApprovalRequest = sideEffects.toolApprovalRequest;
  }

  if (sideEffects.signals.length) {
    body.signals = sideEffects.signals;
  }

  if (sideEffects.toolResults.length) {
    body.toolResults = sideEffects.toolResults;
  }

  if (sideEffects.addReactions.length) {
    body.addReactions = sideEffects.addReactions;
  }

  if (sideEffects.deleteMessages.length) {
    body.deleteMessages = sideEffects.deleteMessages;
  }

  if (sideEffects.resolve) {
    body.resolve = sideEffects.resolve;
  }
}

function toSideEffectEvents(
  sideEffects: SideEffectsSnapshot,
  options?: { deliverApprovalCard?: boolean }
): AgentEvent[] {
  const events: AgentEvent[] = [];

  if (sideEffects.toolApprovalRequest) {
    const request = sideEffects.toolApprovalRequest;
    events.push({
      type: 'tool-approval-request',
      approvalId: request.approvalId,
      toolUseId: request.toolCallId,
      toolName: request.name,
      input: request.input,
      ...(options?.deliverApprovalCard ? { deliverCard: true } : {}),
    });
  }

  for (const result of sideEffects.toolResults) {
    events.push({
      type: 'tool-use-result',
      toolUseId: result.toolCallId,
      content: [
        { type: 'text', text: String(result.preview ?? '') },
        { type: 'json', value: result.output },
      ],
    });
  }

  for (const signal of sideEffects.signals) {
    events.push({ type: 'signal', signal });
  }

  for (const reaction of sideEffects.addReactions) {
    events.push({ type: 'channel.reaction', messageId: reaction.messageId, emoji: reaction.emojiName, op: 'add' });
  }

  for (const deletion of sideEffects.deleteMessages) {
    events.push({ type: 'channel.delete', messageId: deletion.messageId });
  }

  if (sideEffects.resolve) {
    events.push({ type: 'resolve', summary: sideEffects.resolve.summary });
  }

  return events;
}

/** Legacy transport: one POST per turn action against the bridge's `replyUrl`. */
class LegacyPostTransport implements TurnTransport {
  constructor(
    private readonly replyUrl: string,
    private readonly secretKey: string,
    private readonly conversationId: string,
    private readonly integrationIdentifier: string
  ) {}

  async sendReply(reply: ReplyContent, sideEffects: SideEffectsSnapshot): Promise<SentMessageInfo | null> {
    const body = this._baseBody();
    body.reply = reply;
    applySideEffects(body, sideEffects);

    return this._post(body);
  }

  async sendApprovalCard(card: ToolApprovalCard, sideEffects: SideEffectsSnapshot): Promise<SentMessageInfo | null> {
    const body = this._baseBody();
    body.reply = { toolApprovalCard: card };
    applySideEffects(body, sideEffects);

    return this._post(body);
  }

  async editMessage(messageId: string, reply: ReplyContent): Promise<SentMessageInfo | null> {
    return this._post({ ...this._baseBody(), edit: { messageId, content: reply } });
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this._post({ ...this._baseBody(), deleteMessages: [{ messageId }] });
  }

  async setTyping(op: TypingOp): Promise<void> {
    await this._post({ ...this._baseBody(), typing: op });
  }

  async flushSideEffects(sideEffects: SideEffectsSnapshot): Promise<void> {
    const body = this._baseBody();
    applySideEffects(body, sideEffects);
    await this._post(body);
  }

  // Custom events and run lifecycle hooks are SDK-native concepts; legacy bridges have no equivalent.
  async emitCustom(): Promise<void> {}

  queueRunStart(): void {}

  async emitRunFinish(): Promise<void> {}

  async reportTurnError(): Promise<void> {
    await this._post({ ...this._baseBody(), error: true });
  }

  private _baseBody(): AgentReplyPayload {
    return { conversationId: this.conversationId, integrationIdentifier: this.integrationIdentifier };
  }

  private async _post(body: AgentReplyPayload): Promise<SentMessageInfo | null> {
    const response = await fetch(this.replyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${this.secretKey}`,
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

/** SDK-native transport: batches `AgentEvent`s through the run's outbox. */
class EventOutboxTransport implements TurnTransport {
  constructor(private readonly outbox: AgentEventOutbox) {}

  async sendReply(reply: ReplyContent, sideEffects: SideEffectsSnapshot): Promise<SentMessageInfo | null> {
    const messageId = mint('msg');
    const events = toSideEffectEvents(sideEffects);
    events.push({
      type: 'message',
      role: 'assistant',
      messageId,
      content: toAgentMessageContent(reply),
      files: toAgentFileRefs(reply.files),
    });
    await this._emitAndFlush(events);

    return { messageId, platformThreadId: '' };
  }

  // Approval-card rendering is sink-owned in event mode; only the queued side effects
  // (notably the tool-approval-request itself) are drained here. There is no client-addressable
  // message id for the rendered card, so the caller gets a no-op handle rather than a fake one.
  async sendApprovalCard(_card: ToolApprovalCard, sideEffects: SideEffectsSnapshot): Promise<'unaddressable'> {
    await this._emitAndFlush(toSideEffectEvents(sideEffects, { deliverApprovalCard: true }));

    return 'unaddressable';
  }

  async editMessage(messageId: string, reply: ReplyContent): Promise<SentMessageInfo | null> {
    await this.outbox.emit({
      type: 'channel.edit',
      messageId,
      content: toAgentMessageContent(reply),
      files: toAgentFileRefs(reply.files),
    });

    return { messageId, platformThreadId: '' };
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.outbox.emit({ type: 'channel.delete', messageId });
  }

  async setTyping(op: TypingOp): Promise<void> {
    if (op === 'stop') {
      await this.outbox.emit({ type: 'channel.typing', state: 'off' });

      return;
    }

    const status = typeof op === 'object' && 'status' in op ? op.status : undefined;
    await this.outbox.emit({ type: 'channel.typing', state: 'on', status });
  }

  async flushSideEffects(sideEffects: SideEffectsSnapshot): Promise<void> {
    await this._emitAndFlush(toSideEffectEvents(sideEffects));
  }

  async emitCustom(name: string, data: unknown): Promise<void> {
    await this.outbox.emit({ type: 'custom', name, data });
  }

  queueRunStart(): void {
    this.outbox.enqueue({ type: 'run-start' });
  }

  async emitRunFinish(outcome: AgentRunOutcome): Promise<void> {
    await this.outbox.emit({ type: 'run-finish', outcome });
  }

  async reportTurnError(message?: string): Promise<void> {
    await this.outbox.emit({ type: 'run-error', message: message ?? 'agent handler failed' });
  }

  private async _emitAndFlush(events: AgentEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      this.outbox.enqueue(event);
    }

    await this.outbox.flush();
  }
}

class ReplyHandleImpl implements ReplyHandle {
  public messageId: string;
  public platformThreadId: string;
  /** @internal set when the handler calls `edit()`; dispatch skips default approval card cleanup. */
  public editedByHandler = false;

  constructor(
    messageId: string,
    platformThreadId: string,
    private readonly transport: TurnTransport
  ) {
    this.messageId = messageId;
    this.platformThreadId = platformThreadId;
  }

  async edit(content: MessageContent, options?: { files?: FileRef[] }): Promise<ReplyHandle> {
    this.editedByHandler = true;
    const reply = await serializeContent(content, options?.files);
    const info = await this.transport.editMessage(this.messageId, reply);

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

  async delete(): Promise<void> {
    await this.transport.deleteMessage(this.messageId);
  }
}

/**
 * Returned by `replyApprovalCard()` when the transport reports the card as not addressable
 * (event mode: the sink renders the card from the `tool-approval-request` event itself, so
 * there is no client id to edit/delete against). `edit`/`delete` are no-ops rather than
 * emitting a `channel.edit`/`channel.delete` the sink could never resolve.
 */
class NoopReplyHandle implements ReplyHandle {
  readonly messageId = '';
  readonly platformThreadId = '';

  async edit(): Promise<ReplyHandle> {
    return this;
  }

  async delete(): Promise<void> {}
}

export class AgentContextImpl implements AgentRuntimeContext {
  readonly [RUNTIME_CONTEXT_BRAND] = true;
  readonly event: AgentEventEnum;
  readonly action: AgentAction | null;
  readonly message: AgentMessage | null;
  readonly reaction: AgentReaction | null;
  readonly conversation: AgentConversation;
  readonly subscriber: AgentSubscriber | null;
  readonly context: AgentContextPayload | null;
  readonly notification: AgentNotification | null;
  readonly history: AgentHistoryEntry[];
  readonly platform: string;
  readonly platformContext: AgentPlatformContext;
  readonly humanResponse: AgentHumanResponse | null;
  readonly typing: TypingControl;
  readonly toolApproval: ToolApprovalControl;

  readonly metadata: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
    delete(key: string): void;
    clear(): void;
    readonly current: Readonly<Record<string, unknown>>;
  };

  private _signals: Signal[] = [];
  private _toolResults: ToolResult[] = [];
  private _pendingToolApprovalRequest: ToolApprovalRequestPayload | null = null;
  private _pendingReactions: AddReactionPayload[] = [];
  private _pendingDeletes: DeleteMessagePayload[] = [];
  private _resolveSignal: { summary?: string } | null = null;
  private _metadataState: Record<string, unknown>;
  private readonly _toolApprovalConfig?: ToolApprovalConfig;
  private readonly _transport: TurnTransport;

  constructor(request: AgentBridgeRequest, secretKey: string, toolApprovalConfig?: ToolApprovalConfig) {
    this.event = request.event as AgentEventEnum;
    this.action = request.action ?? null;
    this.message = request.message;
    this.reaction = request.reaction;
    this.conversation = request.conversation;
    this.subscriber = request.subscriber;
    this.context = request.context ?? null;
    this.notification = request.notification ?? null;
    this.history = request.history;
    this.platform = request.platform;
    this.platformContext = request.platformContext;
    this.humanResponse = request.humanResponse ?? null;

    this._toolApprovalConfig = toolApprovalConfig;
    this._transport = request.eventsUrl
      ? new EventOutboxTransport(
          new AgentEventOutbox({
            eventsUrl: request.eventsUrl,
            secretKey,
            conversationId: request.conversationId,
            agentId: request.agentId,
            turnId: request.deliveryId,
          })
        )
      : new LegacyPostTransport(request.replyUrl, secretKey, request.conversationId, request.integrationIdentifier);

    this._metadataState = { ...(request.conversation.metadata ?? {}) };

    const self = this;
    this.metadata = {
      get(key: string) {
        return self._metadataState[key];
      },
      set(key: string, value: unknown) {
        self._metadataState[key] = value;
        self._signals.push({ type: 'metadata', action: 'set', key, value });
      },
      delete(key: string) {
        delete self._metadataState[key];
        self._signals.push({ type: 'metadata', action: 'delete', key });
      },
      clear() {
        self._metadataState = {};
        self._signals.push({ type: 'metadata', action: 'clear' });
      },
      get current() {
        return { ...self._metadataState } as Readonly<Record<string, unknown>>;
      },
    };

    const postTyping = (op: TypingOp): Promise<void> => this._transport.setTyping(op);

    const typing = ((status?: string) => postTyping(status === undefined ? {} : { status })) as TypingControl;
    typing.stop = () => postTyping('stop');
    this.typing = typing;

    this.toolApproval = {
      request: async (toolCall: AgentToolCall): Promise<PendingApprovalType> => {
        await postToolApprovalCard(this, toolCall, this._toolApprovalConfig);

        return new PendingApproval();
      },
    };
  }

  asMessageContext(): AgentMessageContext {
    return this as unknown as AgentMessageContext;
  }

  async reply(content: MessageContent, options?: { files?: FileRef[] }): Promise<ReplyHandle> {
    const reply = await serializeContent(content, options?.files);
    const sideEffects = this._drainSideEffectsSnapshot();
    const info = await this._transport.sendReply(reply, sideEffects);

    if (!info) {
      throw new Error('Agent reply did not return a message handle');
    }

    return new ReplyHandleImpl(info.messageId, info.platformThreadId, this._transport);
  }

  async replyApprovalCard(card: ToolApprovalCard): Promise<ReplyHandle> {
    const sideEffects = this._drainSideEffectsSnapshot();
    const info = await this._transport.sendApprovalCard(card, sideEffects);

    if (info === 'unaddressable') {
      return new NoopReplyHandle();
    }

    if (!info) {
      throw new Error('Agent approval card reply did not return a message handle');
    }

    return new ReplyHandleImpl(info.messageId, info.platformThreadId, this._transport);
  }

  /** @internal Build a handle to an already-posted message (used to resume an approval). */
  createReplyHandle(messageId: string): ReplyHandleImpl {
    return new ReplyHandleImpl(messageId, '', this._transport);
  }

  async emit(event: { name: string; data: unknown }): Promise<void> {
    await this._transport.emitCustom(event.name, event.data);
  }

  resolve(summary?: string): void {
    this._resolveSignal = { summary };
  }

  trigger(workflowId: string, opts?: { to?: TriggerRecipientsPayload; payload?: Record<string, unknown> }): void {
    this._signals.push({ ...opts, type: 'trigger', workflowId });
  }

  ask(question: string, opts?: HumanAskApproveOptions): string {
    return this.queueHumanSignal('ask', question, opts);
  }

  approve(action: string, opts?: HumanAskApproveOptions): string {
    return this.queueHumanSignal('approve', action, opts);
  }

  choose(question: string, options: string[], opts?: HumanChooseOptions): string {
    if (options.length < 2 || options.length > 10) {
      throw new Error('ctx.choose requires between 2 and 10 options');
    }

    if (options.some((option) => typeof option !== 'string' || option.trim().length === 0)) {
      throw new Error('ctx.choose options must be non-empty strings');
    }

    return this.queueHumanSignal('choose', question, opts, options);
  }

  tell(message: string, opts?: HumanTellOptions): string {
    return this.queueHumanSignal('tell', message, opts);
  }

  private queueHumanSignal(
    kind: 'ask' | 'approve' | 'choose' | 'tell',
    prompt: string,
    opts?: HumanAskApproveOptions | HumanTellOptions,
    options?: string[]
  ): string {
    const requestId = mint('hr');
    const to = opts?.to !== undefined ? normalizeHumanTo(opts.to) : undefined;
    this._signals.push({
      type: 'human',
      kind,
      prompt,
      requestId,
      ...(options ? { options } : {}),
      ...(opts?.from ? { from: opts.from } : {}),
      ...(opts && 'ttlSeconds' in opts && opts.ttlSeconds !== undefined ? { ttlSeconds: opts.ttlSeconds } : {}),
      ...(to !== undefined ? { to } : {}),
    });

    return requestId;
  }

  /** @internal Queue a gated tool call for the ledger; flushed with the next reply. */
  emitToolApprovalRequest(request: ToolApprovalRequestPayload): void {
    if (this._pendingToolApprovalRequest) {
      throw new Error('Only one tool approval request can be queued before the next reply');
    }

    this._pendingToolApprovalRequest = request;
  }

  /** @internal Queue a tool-call outcome to be recorded in history; flushed with the next reply. */
  emitToolResult(result: ToolResult): void {
    this._toolResults.push(result);
  }

  addReaction(messageId: string, emojiName: Emoji): void {
    this._pendingReactions.push({ messageId, emojiName });
  }

  deleteMessage(messageId: string): void {
    this._pendingDeletes.push({ messageId });
  }

  /** @internal Enqueue run-start before handler execution; flushed with the first emit. */
  queueRunStart(): void {
    this._transport.queueRunStart();
  }

  /** @internal Enqueue and flush run-finish as the terminal success event. */
  async emitRunFinish(options: { outcome: AgentRunOutcome }): Promise<void> {
    try {
      await this._transport.emitRunFinish(options.outcome);
    } catch (err) {
      console.error(`[agent] Failed to emit run finish:`, err);
    }
  }

  /** Best-effort failure report to Novu. Never throws. */
  async reportTurnError(message?: string): Promise<void> {
    try {
      await this._transport.reportTurnError(message);
    } catch (err) {
      // Local only — cannot recurse into onError
      console.error(`[agent] Failed to report turn error:`, err);
    }
  }

  /**
   * Flush any remaining signals that weren't sent with reply().
   * Called internally after onResolve returns.
   */
  async flush(): Promise<void> {
    if (!this._hasPendingSideEffects()) {
      return;
    }

    const sideEffects = this._drainSideEffectsSnapshot();
    await this._transport.flushSideEffects(sideEffects);
  }

  private _hasPendingSideEffects(): boolean {
    return !!(
      this._pendingToolApprovalRequest ||
      this._signals.length ||
      this._toolResults.length ||
      this._resolveSignal ||
      this._pendingReactions.length ||
      this._pendingDeletes.length
    );
  }

  /** Atomically drains all queued side effects into a snapshot for the transport to deliver. */
  private _drainSideEffectsSnapshot(): SideEffectsSnapshot {
    const snapshot: SideEffectsSnapshot = {
      toolApprovalRequest: this._pendingToolApprovalRequest,
      signals: this._signals,
      toolResults: this._toolResults,
      addReactions: this._pendingReactions,
      deleteMessages: this._pendingDeletes,
      resolve: this._resolveSignal,
    };

    this._pendingToolApprovalRequest = null;
    this._signals = [];
    this._toolResults = [];
    this._pendingReactions = [];
    this._pendingDeletes = [];
    this._resolveSignal = null;

    return snapshot;
  }
}
