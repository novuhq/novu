import { isJSX, toCardElement } from 'chat/jsx-runtime';
import type {
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
  MessageContent,
  ReplyContent,
  Signal,
} from './agent.types';

function isCardElement(content: object): content is import('chat').CardElement {
  return 'type' in content && (content as { type: string }).type === 'card';
}

function serializeContent(content: MessageContent): ReplyContent {
  if (typeof content === 'string') {
    return { text: content };
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

  if ('markdown' in content && typeof content.markdown === 'string') {
    const result: ReplyContent = { markdown: content.markdown };
    if (content.files?.length) {
      result.files = content.files;
    }

    return result;
  }

  throw new Error('Invalid message content — expected string, { markdown }, or CardElement');
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
  private _resolveSignal: { summary?: string } | null = null;
  private readonly _replyUrl: string;
  private readonly _conversationId: string;
  private readonly _integrationIdentifier: string;
  private readonly _secretKey: string;

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

    this.metadata = {
      set: (key: string, value: unknown) => {
        this._signals.push({ type: 'metadata', key, value });
      },
    };
  }

  async reply(content: MessageContent): Promise<void> {
    const body: AgentReplyPayload = {
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
      reply: serializeContent(content),
    };

    if (this._signals.length) {
      body.signals = this._signals;
      this._signals = [];
    }

    if (this._resolveSignal) {
      body.resolve = this._resolveSignal;
      this._resolveSignal = null;
    }

    await this._post(body);
  }

  async update(content: MessageContent): Promise<void> {
    const body: AgentReplyPayload = {
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
      update: serializeContent(content),
    };

    await this._post(body);
  }

  resolve(summary?: string): void {
    this._resolveSignal = { summary };
  }

  trigger(workflowId: string, opts?: { to?: string; payload?: Record<string, unknown> }): void {
    this._signals.push({ type: 'trigger', workflowId, ...opts });
  }

  /**
   * Flush any remaining signals that weren't sent with reply().
   * Called internally after onResolve returns.
   */
  async flush(): Promise<void> {
    if (!this._signals.length && !this._resolveSignal) {
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

    if (this._resolveSignal) {
      body.resolve = this._resolveSignal;
      this._resolveSignal = null;
    }

    await this._post(body);
  }

  private async _post(body: AgentReplyPayload): Promise<void> {
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
      throw new Error(`Agent reply failed (${response.status}): ${text}`);
    }
  }
}
