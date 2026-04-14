import type {
  AgentBridgeRequest,
  AgentContext,
  AgentConversation,
  AgentHistoryEntry,
  AgentMessage,
  AgentPlatformContext,
  AgentReplyPayload,
  AgentSubscriber,
  Signal,
} from './agent.types';

export class AgentContextImpl implements AgentContext {
  readonly event: string;
  readonly message: AgentMessage | null;
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
    this.message = request.message;
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

  async reply(text: string): Promise<void> {
    const body: AgentReplyPayload = {
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
      reply: { text },
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

  async update(text: string): Promise<void> {
    const body: AgentReplyPayload = {
      conversationId: this._conversationId,
      integrationIdentifier: this._integrationIdentifier,
      update: { text },
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
