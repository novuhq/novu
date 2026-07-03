import type { Emoji } from 'chat';
import { AgentDeliveryError } from './agent.errors';
import { type AgentRuntimeContext, RUNTIME_CONTEXT_BRAND } from './agent.runtime';
import type {
  AddReactionPayload,
  AgentAction,
  AgentBridgeRequest,
  AgentConversation,
  AgentHistoryEntry,
  AgentMessage,
  AgentMessageContext,
  AgentPlatformContext,
  AgentReaction,
  AgentReplyPayload,
  AgentSubscriber,
  AgentToolCall,
  FileRef,
  MessageContent,
  PendingApproval as PendingApprovalType,
  PlanControl,
  PlanHandle,
  PlanProgressEvent,
  ReplyContent,
  ReplyHandle,
  SentMessageInfo,
  Signal,
  ToolApprovalConfig,
  ToolApprovalControl,
  ToolResult,
  TriggerRecipientsPayload,
  TypingControl,
  TypingOp,
} from './agent.types';
import { AgentEventEnum, PendingApproval } from './agent.types';
import { isCardElement } from './guards';
import { createPlanHandle, type InternalPlanHandle } from './plan-handle';
import { wrapToolsWithPlan } from './plan-track';
import type { ToolApprovalRequestPayload } from './tool-approval/action-id';
import { postToolApprovalCard } from './tool-approval/post-card';

/** Default plan card title when `ctx.plan.track(tools)` lazy-creates a plan. */
export const DEFAULT_TRACKED_PLAN_TITLE = 'Thinking…';

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

  const { isJSX, toCardElement } = await import('chat/jsx-runtime');

  if (isJSX(content)) {
    const card = toCardElement(content);
    if (card) {
      return validFiles ? { card, files: validFiles } : { card };
    }
  }

  if (isCardElement(content)) {
    return validFiles ? { card: content, files: validFiles } : { card: content };
  }

  throw new Error('Invalid message content — expected string or CardElement');
}

interface ReplyPoster {
  post(body: AgentReplyPayload): Promise<SentMessageInfo | null>;
}

class ReplyHandleImpl implements ReplyHandle {
  public messageId: string;
  public platformThreadId: string;
  /** @internal set when the handler calls `edit()`; dispatch skips the default resolved card. */
  public editedByHandler = false;

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
    this.editedByHandler = true;
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

export class AgentContextImpl implements AgentRuntimeContext {
  readonly [RUNTIME_CONTEXT_BRAND] = true;
  readonly event: AgentEventEnum;
  readonly action: AgentAction | null;
  readonly message: AgentMessage | null;
  readonly reaction: AgentReaction | null;
  readonly conversation: AgentConversation;
  readonly subscriber: AgentSubscriber | null;
  readonly history: AgentHistoryEntry[];
  readonly platform: string;
  readonly platformContext: AgentPlatformContext;
  readonly typing: TypingControl;
  readonly plan: PlanControl;
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
  private _resolveSignal: { summary?: string } | null = null;
  private _metadataState: Record<string, unknown>;
  private _planHandle: InternalPlanHandle | undefined;
  /** Set when this turn updates a plan card from a prior turn (e.g. approval). */
  private _remotePlanActive = false;
  private readonly _toolApprovalConfig?: ToolApprovalConfig;
  private readonly _replyUrl: string;
  private readonly _conversationId: string;
  private readonly _integrationIdentifier: string;
  private readonly _secretKey: string;
  private readonly _poster: ReplyPoster;

  constructor(request: AgentBridgeRequest, secretKey: string, toolApprovalConfig?: ToolApprovalConfig) {
    this.event = request.event as AgentEventEnum;
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
    this._toolApprovalConfig = toolApprovalConfig;

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

    const postTyping = (op: TypingOp): Promise<void> =>
      this._post({
        conversationId: this._conversationId,
        integrationIdentifier: this._integrationIdentifier,
        typing: op,
      }).then(() => undefined);

    const typing = ((status?: string) => postTyping(status === undefined ? {} : { status })) as TypingControl;
    typing.stop = () => postTyping('stop');
    this.typing = typing;

    const postPlan = (event: PlanProgressEvent): Promise<void> =>
      this._post({
        conversationId: this._conversationId,
        integrationIdentifier: this._integrationIdentifier,
        planProgress: event,
      }).then(() => undefined);

    const planFn = (title?: string): PlanHandle => {
      if (this._planHandle) {
        if (title !== undefined) {
          this._planHandle.title(title);
        }

        return this._planHandle;
      }

      this._planHandle = createPlanHandle(postPlan, title);

      return this._planHandle;
    };

    const planControl = planFn as PlanControl;
    planControl.track = (tools) => wrapToolsWithPlan(() => this.resolvePlanForToolTracking(), tools);
    this.plan = planControl;

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

    const body: AgentReplyPayload = {
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
      reply,
    };

    this._drainSideEffects(body);

    const info = await this._post(body);
    if (!info) {
      throw new Error('Agent reply did not return a message handle');
    }

    if (body.toolApprovalRequest) {
      await this._pausePlanForApproval();
    }

    return new ReplyHandleImpl(
      info.messageId,
      info.platformThreadId,
      this._conversationId,
      this._integrationIdentifier,
      this._poster
    );
  }

  /** @internal Build a handle to an already-posted message (used to resume an approval). */
  createReplyHandle(messageId: string): ReplyHandleImpl {
    return new ReplyHandleImpl(messageId, '', this._conversationId, this._integrationIdentifier, this._poster);
  }

  resolve(summary?: string): void {
    this._resolveSignal = { summary };
  }

  trigger(workflowId: string, opts?: { to?: TriggerRecipientsPayload; payload?: Record<string, unknown> }): void {
    this._signals.push({ ...opts, type: 'trigger', workflowId });
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

  /**
   * Flush any remaining signals that weren't sent with reply().
   * Called internally after onResolve returns.
   */
  async flush(): Promise<void> {
    if (!this._hasPendingSideEffects()) {
      return;
    }

    const body: AgentReplyPayload = {
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
    };

    this._drainSideEffects(body);

    await this._post(body);

    if (body.toolApprovalRequest) {
      await this._pausePlanForApproval();
    }
  }

  private _hasPendingSideEffects(): boolean {
    return !!(
      this._pendingToolApprovalRequest ||
      this._signals.length ||
      this._toolResults.length ||
      this._resolveSignal ||
      this._pendingReactions.length
    );
  }

  private _drainSideEffects(body: AgentReplyPayload): void {
    if (this._pendingToolApprovalRequest) {
      body.toolApprovalRequest = this._pendingToolApprovalRequest;
      this._pendingToolApprovalRequest = null;
    }

    if (this._signals.length) {
      body.signals = this._signals;
      this._signals = [];
    }

    if (this._toolResults.length) {
      body.toolResults = this._toolResults;
      this._toolResults = [];
    }

    if (this._pendingReactions.length) {
      body.addReactions = this._pendingReactions;
      this._pendingReactions = [];
    }

    if (this._resolveSignal) {
      body.resolve = this._resolveSignal;
      this._resolveSignal = null;
    }
  }

  private resolvePlanForToolTracking(): InternalPlanHandle {
    if (this._planHandle) {
      return this._planHandle;
    }

    this.plan(DEFAULT_TRACKED_PLAN_TITLE);
    if (!this._planHandle) {
      throw new Error('Plan handle missing after ctx.plan()');
    }

    return this._planHandle;
  }

  private async _pausePlanForApproval(): Promise<void> {
    await this._planHandle?.pauseForApproval();
  }

  async finalizePlan(phase: 'finished' | 'failed'): Promise<void> {
    if (this._planHandle) {
      await this._planHandle.autoFinalize(phase);

      return;
    }

    if (!this._remotePlanActive) {
      return;
    }

    await this.postPlanProgress({ kind: 'phase', phase });
  }

  async postPlanProgress(event: PlanProgressEvent): Promise<void> {
    this._remotePlanActive = true;

    await this._post({
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
      planProgress: event,
    });
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
