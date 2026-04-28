import { isJSX, toCardElement } from 'chat/jsx-runtime';
import { AgentDeliveryError } from './agent.errors';
import type { Emoji } from 'chat';
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

function isCardElement(content: object): content is import('chat').CardElement {
  return 'type' in content && (content as { type: string }).type === 'card';
}

function serializeContent(content: MessageContent, files?: FileRef[]): ReplyContent {
  if (typeof content === 'string') {
    return files?.length ? { markdown: content, files } : { markdown: content };
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
        content: serializeContent(content, options?.files),
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
      reply: serializeContent(content, options?.files),
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
