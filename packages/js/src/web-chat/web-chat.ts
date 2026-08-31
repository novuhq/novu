import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { InboxService, WebChatPlanLimitError, WebChatService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import type { BaseSocketInterface } from '../ws/base-socket';
import { AgentConversationRuntime } from './agent-conversation-runtime';
import { type AgentConversationError, type AgentMessage, derivePendingActions } from './agent-message.types';
import type { ConversationArgs } from './conversation-runtime.types';
import { createActionIdempotencyKeyForScope, createMessageIdempotencyKey } from './idempotency';
import { runtimeCacheKey } from './runtime-cache-key';
import type {
  FetchMoreArgs,
  FetchMoreResult,
  LoadConversationArgs,
  LoadConversationResult,
  RespondToActionArgs,
  RespondToActionResult,
  RetryMessageArgs,
  RetryMessageResult,
  SendActionArgs,
  SendActionResult,
  SendMessageArgs,
  SendMessageResult,
  WebChatChange,
  WebChatMessagesUpdated,
  WebChatPagination,
} from './types';
import { parseAgentEventEnvelope } from './validate-envelope';
import { type ConversationEntry, createLocalConversationKey, WebChatStore } from './web-chat-store';

function conversationErrorToNovuError(error: AgentConversationError): NovuError {
  return new NovuError(error.message, new Error(error.code ?? error.message));
}

function entryPagination(entry: ConversationEntry): WebChatPagination {
  return {
    status: entry.paginationStatus,
    hasMore: entry.olderCursor != null,
  };
}

/** Max HTTP pages for reconnect recovery when a sequence checkpoint exists. */
const CATCH_UP_PAGE_LIMIT = 20;

/**
 * Headless Web Chat client. Load it with `await novu.loadWebChat()` or `loadWebChat(novu)`,
 * then call {@link WebChat.conversation} for each thread.
 */
export class WebChat extends BaseModule {
  #webChatService: WebChatService;
  #store: WebChatStore;
  #socket: Pick<BaseSocketInterface, 'connect'>;
  #liveSubscriberCount = 0;
  #runtimes = new Map<string, AgentConversationRuntime>();
  /**
   * Per-conversation live envelope buffers while reconnect catch-up is in flight.
   * Map key means catch-up is in flight; only those conversations buffer live envelopes.
   */
  #catchUpBuffers = new Map<string, AgentEventEnvelope[]>();
  #catchUpChain: Promise<void> = Promise.resolve();

  constructor({
    inboxServiceInstance,
    eventEmitterInstance,
    webChatService,
    socket,
  }: {
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
    webChatService: WebChatService;
    socket: Pick<BaseSocketInterface, 'connect'>;
  }) {
    super({ inboxServiceInstance, eventEmitterInstance });
    this.#webChatService = webChatService;
    this.#socket = socket;
    this.#store = new WebChatStore((entry, change) => {
      this.#emitMessagesUpdated(entry, change);
    });
    this._emitter.on('web_chat.agent_event', ({ result }) => {
      this.#handleAgentEvent(result);
    });
    this._emitter.on('socket.connect.resolved', ({ error }) => {
      if (error) {
        return;
      }

      this.#requestCatchUp();
    });
  }

  /** @internal Keep the live socket connected while at least one consumer is active. */
  subscribe(): void {
    this.#liveSubscriberCount += 1;
    if (this.#liveSubscriberCount === 1) {
      void this.#socket.connect();
    }
  }

  /** @internal */
  unsubscribe(): void {
    if (this.#liveSubscriberCount === 0) {
      return;
    }

    this.#liveSubscriberCount -= 1;
  }

  /** Drop all local conversation state and runtimes. */
  clearCache(): void {
    for (const runtime of [...this.#runtimes.values()]) {
      runtime.dispose();
    }

    this.#store.clear();
    this.#catchUpBuffers.clear();
    this.#runtimes.clear();
  }

  /**
   * Return a runtime for one conversation.
   * Calls with the same `agentId` and `conversationId` reuse the same runtime.
   * Omit `conversationId` to start a new chat. Call {@link AgentConversationRuntime.dispose} when the chat unmounts.
   */
  conversation(args: ConversationArgs): AgentConversationRuntime {
    const cacheKey = args.conversationId ? runtimeCacheKey(args.agentId, args.conversationId) : undefined;
    if (cacheKey) {
      const existing = this.#runtimes.get(cacheKey);
      if (existing) {
        return existing;
      }
    }

    const runtime = new AgentConversationRuntime(this, args);
    if (cacheKey) {
      this.#runtimes.set(cacheKey, runtime);
    }

    return runtime;
  }

  /** @internal */
  onMessagesUpdated(listener: (data: WebChatMessagesUpdated) => void): () => void {
    return this._emitter.on('web_chat.messages.updated', ({ data }) => {
      listener(data);
    });
  }

  /** @internal */
  registerRuntime(cacheKey: string, runtime: AgentConversationRuntime): void {
    const existing = this.#runtimes.get(cacheKey);
    if (existing && existing !== runtime) {
      existing.dispose();
    }

    this.#runtimes.set(cacheKey, runtime);
  }

  /** @internal */
  unregisterRuntime(runtime: AgentConversationRuntime): void {
    for (const [key, value] of this.#runtimes.entries()) {
      if (value === runtime) {
        this.#runtimes.delete(key);
      }
    }
  }

  /** @internal */
  getConversation({ agentId, conversationId, key }: { agentId: string; conversationId?: string; key?: string }):
    | {
        conversationId?: string;
        messages: AgentMessage[];
        key: string;
        isRunning: boolean;
        typing?: ConversationEntry['typing'];
        status: ConversationEntry['status'];
        hasMore: boolean;
        pagination: WebChatPagination;
        isRecovering: boolean;
        error?: NovuError;
        catchUpError?: NovuError;
      }
    | undefined {
    const entry = key
      ? this.#store.get(key)
      : conversationId
        ? (this.#store.get(conversationId) ?? this.#store.getByConversationId(agentId, conversationId))
        : undefined;

    if (!entry || entry.agentId !== agentId) {
      return undefined;
    }

    return {
      conversationId: entry.conversationId,
      messages: entry.messages,
      key: entry.key,
      isRunning: entry.isRunning,
      typing: entry.typing,
      status: entry.status,
      hasMore: entry.olderCursor != null,
      pagination: entryPagination(entry),
      isRecovering: entry.isRecovering,
      error: entry.error ? conversationErrorToNovuError(entry.error) : undefined,
      catchUpError: entry.catchUpError,
    };
  }

  /** @internal Prefer {@link AgentConversationRuntime.respondToAction}. */
  async respondToAction(args: RespondToActionArgs): Result<RespondToActionResult, NovuError | WebChatPlanLimitError> {
    return this.#withConversationAction(
      args,
      'Cannot respond to action without a conversation id',
      'Failed to respond to action',
      async (entry, conversationId) => {
        const pending = derivePendingActions(entry.messages).find((action) => action.id === args.actionId);
        if (!pending || pending.type !== 'tool-approval') {
          return { error: new NovuError('Pending action not found', new Error('pending action not found')) };
        }

        const actionId = {
          approved: pending.approveActionId,
          denied: pending.denyActionId,
          'trust-tool': pending.trustToolActionId,
          'trust-server': pending.trustServerActionId,
        }[args.decision];
        if (!actionId) {
          return {
            error: new NovuError(
              'Pending approval is missing action id',
              new Error('pending approval missing action id')
            ),
          };
        }

        const scope = `respond:${conversationId}:${args.actionId}:${args.decision}`;
        const idempotencyKey = createActionIdempotencyKeyForScope(scope);

        return this.#webChatService.respondToAction({
          agentId: args.agentId,
          conversationId,
          actionId,
          idempotencyKey,
          agentHash: args.agentHash,
        });
      }
    );
  }

  /** @internal Prefer {@link AgentConversationRuntime.sendAction}. */
  async sendAction(args: SendActionArgs): Result<SendActionResult, NovuError | WebChatPlanLimitError> {
    return this.#withConversationAction(
      args,
      'Cannot send action without a conversation id',
      'Failed to send action',
      async (_entry, conversationId) => {
        const actionId = args.actionId.trim();
        const sourceMessageId = args.sourceMessageId.trim();
        if (!actionId) {
          return { error: new NovuError('actionId is required', new Error('missing action id')) };
        }
        if (!sourceMessageId) {
          return { error: new NovuError('sourceMessageId is required', new Error('missing source message id')) };
        }

        const scope = `send:${conversationId}:${actionId}:${sourceMessageId}:${args.value ?? ''}`;
        const idempotencyKey = createActionIdempotencyKeyForScope(scope);

        return this.#webChatService.sendAction({
          agentId: args.agentId,
          conversationId,
          actionId,
          sourceMessageId,
          value: args.value,
          idempotencyKey,
          agentHash: args.agentHash,
        });
      }
    );
  }

  /** @internal Prefer {@link AgentConversationRuntime.load}. */
  async loadConversation(args: LoadConversationArgs): Result<LoadConversationResult> {
    return this.callWithSession(async () => {
      try {
        const page = await this.#webChatService.getEvents({
          conversationId: args.conversationId,
        });

        const entry = this.#store.getOrCreate({
          agentId: args.agentId,
          key: args.conversationId,
          conversationId: args.conversationId,
        });
        const next = this.#store.absorbHistoryPage(entry, page.events, page.olderCursor);

        return {
          data: {
            conversationId: args.conversationId,
            messages: next.messages,
            hasMore: next.olderCursor != null,
          },
        };
      } catch (error) {
        return { error: new NovuError('Failed to load web chat conversation', error) };
      }
    });
  }

  /** @internal Prefer {@link AgentConversationRuntime.fetchMore}. */
  async fetchMore(args: FetchMoreArgs): Result<FetchMoreResult> {
    return this.callWithSession(async () => {
      const entry = this.#resolveFetchEntry(args);
      if (!entry?.conversationId) {
        return {
          data: {
            messages: entry?.messages ?? [],
            hasMore: entry != null && entry.olderCursor != null,
          },
        };
      }

      if (entry.olderCursor == null) {
        return {
          data: {
            messages: entry.messages,
            hasMore: false,
          },
        };
      }

      return this.#store.withFetchMoreClaim(entry, async () => {
        const epochAtStart = entry.paginationEpoch;

        try {
          const page = await this.#webChatService.getEvents({
            conversationId: entry.conversationId!,
            before: entry.olderCursor!,
          });

          if (epochAtStart !== entry.paginationEpoch) {
            return {
              data: {
                messages: entry.messages,
                hasMore: entry.olderCursor != null,
              },
            };
          }

          const next = this.#store.prependOlderPage(entry, page.events, page.olderCursor);

          return {
            data: {
              messages: next.messages,
              hasMore: next.olderCursor != null,
            },
          };
        } catch (error) {
          return { error: new NovuError('Failed to load older web chat messages', error) };
        }
      });
    });
  }

  /**
   * @internal Prefer {@link AgentConversationRuntime.sendMessage}.
   * Rejected while an agent turn is in progress.
   */
  async sendMessage(args: SendMessageArgs): Result<SendMessageResult, NovuError | WebChatPlanLimitError> {
    return this.callWithSession<SendMessageResult, NovuError | WebChatPlanLimitError>(async () => {
      const key = args.key ?? args.conversationId ?? createLocalConversationKey();
      const entry = this.#resolveSendEntry(args, key);

      const blocked = this.#maybeBlockSendDuringRun(entry);
      if (blocked) {
        return blocked;
      }

      const idempotencyKey = createMessageIdempotencyKey();
      const optimisticId = this.#store.appendSending(entry, args.text, idempotencyKey);

      return this.#deliverOutboundMessage(entry, {
        agentId: args.agentId,
        text: args.text,
        conversationId: args.conversationId,
        agentHash: args.agentHash,
        metadata: args.metadata,
        optimisticId,
        idempotencyKey,
      });
    });
  }

  /**
   * @internal Prefer {@link AgentConversationRuntime.retryMessage}.
   * Resends a failed message with the original idempotency key. Does not create a second message.
   */
  async retryMessage(args: RetryMessageArgs): Result<RetryMessageResult, NovuError | WebChatPlanLimitError> {
    return this.callWithSession<RetryMessageResult, NovuError | WebChatPlanLimitError>(async () => {
      const entry = this.#resolveFetchEntry(args);
      if (!entry) {
        return {
          error: new NovuError('Cannot retry message without a conversation', new Error('missing entry')),
        };
      }

      const message = this.#store.findMessage(entry, args.messageId);
      if (!message?.idempotencyKey) {
        return {
          error: new NovuError('Message is not retryable', new Error('missing idempotency key')),
        };
      }

      if (message.status === 'sent') {
        const conversationId = entry.conversationId ?? args.conversationId;
        if (!conversationId) {
          return {
            error: new NovuError('Message is not retryable', new Error('missing conversation id')),
          };
        }

        return {
          data: {
            conversationId,
            messageId: message.id,
          },
        };
      }

      if (message.status !== 'failed') {
        return {
          error: new NovuError('Message is not retryable', new Error(`status ${message.status}`)),
        };
      }

      const blocked = this.#maybeBlockSendDuringRun(entry);
      if (blocked) {
        return blocked;
      }

      const text = message.parts.find((part) => part.type === 'text')?.text;
      if (!text) {
        return {
          error: new NovuError('Message is not retryable', new Error('missing text part')),
        };
      }

      if (!this.#store.markRetrying(entry, args.messageId)) {
        return {
          error: new NovuError('Message is not retryable', new Error('mark retry failed')),
        };
      }

      return this.#deliverOutboundMessage(entry, {
        agentId: args.agentId,
        text,
        conversationId: entry.conversationId ?? args.conversationId,
        agentHash: args.agentHash,
        optimisticId: args.messageId,
        idempotencyKey: message.idempotencyKey,
      });
    });
  }

  async #deliverOutboundMessage(
    entry: ConversationEntry,
    args: {
      agentId: string;
      text: string;
      conversationId?: string;
      agentHash?: string;
      metadata?: SendMessageArgs['metadata'];
      optimisticId: string;
      idempotencyKey: string;
    }
  ): Result<SendMessageResult, NovuError | WebChatPlanLimitError> {
    return this.#store.withCreateClaim(entry, args.conversationId, async (conversationId) => {
      try {
        const data = await this.#webChatService.sendMessage({
          agentId: args.agentId,
          text: args.text,
          conversationId,
          messageId: args.idempotencyKey,
          agentHash: args.agentHash,
          metadata: args.metadata,
        });

        this.#store.markSent(entry, {
          optimisticMessageId: args.optimisticId,
          serverMessageId: data.messageId,
          conversationId: data.identifier,
          idempotencyKey: args.idempotencyKey,
        });

        this.#requestCatchUp();

        return {
          data: {
            conversationId: data.identifier,
            messageId: data.messageId,
          },
        };
      } catch (error) {
        this.#store.markFailed(entry, args.optimisticId);

        if (error instanceof WebChatPlanLimitError) {
          return { error };
        }

        return { error: new NovuError('Failed to send web chat message', error) };
      }
    });
  }

  #maybeBlockSendDuringRun(entry: ConversationEntry): { error: NovuError } | undefined {
    if (!entry.isRunning) {
      return undefined;
    }

    return {
      error: new NovuError('Cannot send while the agent is running', new Error('send rejected during active run')),
    };
  }

  /** Shared session and plan-limit wrapper for `respondToAction` and `sendAction`. */
  async #withConversationAction(
    args: { agentId: string; conversationId?: string; key?: string },
    missingConversationMessage: string,
    failureMessage: string,
    run: (entry: ConversationEntry, conversationId: string) => Promise<{ identifier: string } | { error: NovuError }>
  ): Result<{ conversationId: string }, NovuError | WebChatPlanLimitError> {
    return this.callWithSession<{ conversationId: string }, NovuError | WebChatPlanLimitError>(async () => {
      const entry = this.#resolveFetchEntry(args);
      const conversationId = entry?.conversationId;
      if (!entry || !conversationId) {
        return {
          error: new NovuError(missingConversationMessage, new Error('missing conversation id')),
        };
      }

      try {
        const result = await run(entry, conversationId);
        if ('error' in result) {
          return { error: result.error };
        }

        // Resume paths (approvals, card clicks) can emit before the HTTP ack;
        // catch up like sendMessage so live WS overlap is not dropped.
        this.#requestCatchUp();

        return { data: { conversationId: result.identifier } };
      } catch (error) {
        if (error instanceof WebChatPlanLimitError) {
          return { error };
        }

        return { error: new NovuError(failureMessage, error) };
      }
    });
  }

  #resolveFetchEntry(args: FetchMoreArgs): ConversationEntry | undefined {
    if (args.key) {
      const byKey = this.#store.get(args.key);
      if (byKey && byKey.agentId === args.agentId) {
        return byKey;
      }
    }

    if (args.conversationId) {
      return this.#store.get(args.conversationId) ?? this.#store.getByConversationId(args.agentId, args.conversationId);
    }

    return undefined;
  }

  /** Resolve the local session for a send. Reject a key that belongs to another agent or conversation. */
  #resolveSendEntry(args: SendMessageArgs, key: string): ConversationEntry {
    const byKey = this.#store.get(key);
    if (byKey && this.#isUsableSendEntry(byKey, args)) {
      return byKey;
    }

    if (args.conversationId) {
      return (
        this.#store.getByConversationId(args.agentId, args.conversationId) ??
        this.#store.getOrCreate({
          agentId: args.agentId,
          key: args.conversationId,
          conversationId: args.conversationId,
        })
      );
    }

    // If the key is stale, do not call getOrCreate with that key. That returns the wrong session.
    const createKey = byKey ? createLocalConversationKey() : key;

    return this.#store.getOrCreate({
      agentId: args.agentId,
      key: createKey,
    });
  }

  #isUsableSendEntry(entry: ConversationEntry, args: SendMessageArgs): boolean {
    if (entry.agentId !== args.agentId) {
      return false;
    }

    if (
      args.conversationId !== undefined &&
      entry.conversationId !== undefined &&
      entry.conversationId !== args.conversationId
    ) {
      return false;
    }

    return true;
  }

  /**
   * Apply live envelopes to open conversations only.
   * Unknown conversations are dropped. During reconnect recovery, only that conversation buffers.
   */
  #handleAgentEvent(raw: unknown): void {
    const parsed = parseAgentEventEnvelope(raw);
    if (!parsed.ok) {
      console.warn('[novu web-chat] skipping live envelope:', parsed.reason);

      return;
    }

    const envelope = parsed.envelope;
    const conversationId = envelope.conversationIdentifier;
    if (!conversationId) {
      return;
    }

    if (this.#catchUpBuffers.has(conversationId)) {
      const buffer = this.#catchUpBuffers.get(conversationId);
      buffer?.push(envelope);

      return;
    }

    this.#applyLiveEnvelope(envelope);
  }

  #applyLiveEnvelope(envelope: AgentEventEnvelope): void {
    const conversationId = envelope.conversationIdentifier;
    if (!conversationId) {
      return;
    }

    const entries = this.#store.findByConversationId(envelope.agentId, conversationId);
    for (const entry of entries) {
      this.#store.applyLiveEnvelope(entry, envelope);
    }
  }

  #requestCatchUp(): void {
    if (this.#liveSubscriberCount === 0) {
      return;
    }

    // Keep the chain alive after a rejected run so later reconnects still catch up.
    this.#catchUpChain = this.#catchUpChain.catch(() => undefined).then(() => this.#catchUpOpenConversations());
  }

  async #catchUpOpenConversations(): Promise<void> {
    if (this.#liveSubscriberCount === 0 || !this._inboxService.isSessionInitialized) {
      return;
    }

    const claimed = this.#store.listClaimed();
    if (claimed.length === 0) {
      return;
    }

    const byConversationId = new Map<string, ConversationEntry[]>();
    for (const entry of claimed) {
      const holders = byConversationId.get(entry.conversationId) ?? [];
      holders.push(entry);
      byConversationId.set(entry.conversationId, holders);
    }

    await Promise.all(
      [...byConversationId.entries()].map(([conversationId, holders]) =>
        this.#catchUpConversation(conversationId, holders)
      )
    );
  }

  #emitMessagesUpdated(entry: ConversationEntry, change: WebChatChange): void {
    this._emitter.emit('web_chat.messages.updated', {
      data: {
        agentId: entry.agentId,
        conversationId: entry.conversationId,
        key: entry.key,
        messages: entry.messages,
        isRunning: entry.isRunning,
        typing: entry.typing,
        status: entry.status,
        hasMore: entry.olderCursor != null,
        pagination: entryPagination(entry),
        error: entry.error ? conversationErrorToNovuError(entry.error) : undefined,
        isRecovering: entry.isRecovering,
        ...(entry.catchUpError ? { catchUpError: entry.catchUpError } : {}),
        change,
      },
    });
  }

  async #catchUpConversation(conversationId: string, holders: ConversationEntry[]): Promise<void> {
    const activeHolders = holders
      .map((holder) => this.#store.get(holder.key))
      .filter((entry): entry is ConversationEntry => entry != null && entry.conversationId === conversationId);

    if (activeHolders.length === 0) {
      return;
    }

    this.#catchUpBuffers.set(conversationId, []);
    for (const entry of activeHolders) {
      this.#store.setRecoveryState(entry, { isRecovering: true });
    }

    let discardBufferedEnvelopes = false;

    try {
      // Page toward older events until we reach already-known sequence territory.
      // One newest page is not enough when the offline gap exceeds the server page size.
      const knownThrough = Math.min(...activeHolders.map((entry) => entry.lastSequence));
      const missed: AgentEventEnvelope[] = [];
      let before: string | undefined;
      let completed = false;

      for (let pageIndex = 0; ; pageIndex += 1) {
        if (knownThrough > 0 && pageIndex >= CATCH_UP_PAGE_LIMIT) {
          break;
        }

        const page = await this.#webChatService.getEvents({
          conversationId,
          ...(before ? { before } : {}),
        });
        const envelopes = [...page.events].sort((left, right) => left.sequence - right.sequence);
        missed.push(...envelopes);

        const oldestInPage = envelopes[0]?.sequence;
        if (page.olderCursor == null || oldestInPage == null) {
          completed = true;
          break;
        }

        if (knownThrough > 0 && oldestInPage <= knownThrough) {
          completed = true;
          break;
        }

        before = page.olderCursor;
      }

      if (!completed) {
        // On catch-up failure the conversation stays stale and errored rather than showing messages across a known gap.
        discardBufferedEnvelopes = true;
        const catchUpError = new NovuError(
          'Web Chat reconnect catch-up exceeded the safety page limit; conversation history may be incomplete',
          new Error('catch_up_limit_exceeded')
        );
        for (const entry of activeHolders) {
          this.#store.setRecoveryState(entry, { isRecovering: entry.isRecovering, catchUpError });
        }

        return;
      }

      // Apply oldest→newest so message order stays chronological across pages.
      missed.sort((left, right) => left.sequence - right.sequence);

      for (const holder of activeHolders) {
        const entry = this.#store.get(holder.key);
        if (!entry || entry.conversationId !== conversationId) {
          continue;
        }

        this.#store.setRecoveryState(entry, { isRecovering: entry.isRecovering, catchUpError: undefined });
        for (const envelope of missed) {
          this.#store.applyLiveEnvelope(entry, envelope);
        }
      }
    } catch (error) {
      const catchUpError = new NovuError('Failed to recover web chat conversation after reconnect', error);
      for (const holder of activeHolders) {
        const entry = this.#store.get(holder.key);
        if (!entry || entry.conversationId !== conversationId) {
          continue;
        }

        this.#store.setRecoveryState(entry, { isRecovering: entry.isRecovering, catchUpError });
      }
    } finally {
      const buffered = this.#catchUpBuffers.get(conversationId) ?? [];
      this.#catchUpBuffers.delete(conversationId);

      for (const holder of activeHolders) {
        const entry = this.#store.get(holder.key);
        if (!entry || entry.conversationId !== conversationId) {
          continue;
        }

        this.#store.setRecoveryState(entry, { isRecovering: false, catchUpError: entry.catchUpError });
      }

      if (!discardBufferedEnvelopes) {
        for (const envelope of buffered) {
          this.#applyLiveEnvelope(envelope);
        }
      }
    }
  }
}
