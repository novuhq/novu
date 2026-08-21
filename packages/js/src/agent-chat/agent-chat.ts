import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { isAgentEventEnvelope } from '@novu/agent-event-protocol';
import { AgentChatPlanLimitError, AgentChatService, InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import type { BaseSocketInterface } from '../ws/base-socket';
import { AgentChatStore, type ConversationEntry, createLocalConversationKey } from './agent-chat-store';
import { AgentConversationRuntime } from './agent-conversation-runtime';
import { type AgentConversationError, type AgentMessage, derivePendingActions } from './agent-message.types';
import type { ConversationArgs, ConversationResult } from './conversation-runtime.types';
import { runtimeCacheKey } from './runtime-cache-key';
import type {
  AgentChatChange,
  AgentChatMessagesUpdated,
  AgentChatPagination,
  FetchMoreArgs,
  FetchMoreResult,
  LoadConversationArgs,
  LoadConversationResult,
  RespondToActionArgs,
  RespondToActionResult,
  SendActionArgs,
  SendActionResult,
  SendMessageArgs,
  SendMessageResult,
} from './types';

function conversationErrorToNovuError(error: AgentConversationError): NovuError {
  return new NovuError(error.message, new Error(error.code ?? error.message));
}

function entryPagination(entry: ConversationEntry): AgentChatPagination {
  return {
    status: entry.paginationStatus,
    hasMore: entry.olderCursor != null,
  };
}

/** Safety cap on reconnect catch-up HTTP pages. Exceeding this sets a public error. */
const CATCH_UP_PAGE_LIMIT = 20;

export class AgentChat extends BaseModule {
  #agentChatService: AgentChatService;
  #store: AgentChatStore;
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
    agentChatService,
    socket,
  }: {
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
    agentChatService: AgentChatService;
    socket: Pick<BaseSocketInterface, 'connect'>;
  }) {
    super({ inboxServiceInstance, eventEmitterInstance });
    this.#agentChatService = agentChatService;
    this.#socket = socket;
    this.#store = new AgentChatStore((entry, change) => {
      this.#emitMessagesUpdated(entry, change);
    });
    this._emitter.on('agent_chat.agent_event', ({ result }) => {
      this.#handleAgentEvent(result);
    });
    this._emitter.on('socket.connect.resolved', ({ error }) => {
      if (error) {
        return;
      }

      this.#requestCatchUp();
    });
  }

  /**
   * Keep the socket connected while at least one consumer wants live events.
   * Call from hook mount / vanilla open. Pair with `unsubscribe`.
   */
  subscribe(): void {
    this.#liveSubscriberCount += 1;
    if (this.#liveSubscriberCount === 1) {
      void this.#socket.connect();
    }
  }

  unsubscribe(): void {
    if (this.#liveSubscriberCount === 0) {
      return;
    }

    this.#liveSubscriberCount -= 1;
  }

  clearCache(): void {
    for (const runtime of [...this.#runtimes.values()]) {
      runtime.dispose();
    }

    this.#store.clear();
    this.#catchUpBuffers.clear();
    this.#runtimes.clear();
  }

  /**
   * Return a stable conversation runtime for one agent thread.
   * Resume sessions (`conversationId` set) are reused across calls with the same identity.
   */
  conversation(args: ConversationArgs): ConversationResult<AgentConversationRuntime> {
    const cacheKey = args.conversationId ? runtimeCacheKey(args.agentId, args.conversationId) : undefined;
    if (cacheKey) {
      const existing = this.#runtimes.get(cacheKey);
      if (existing) {
        return { ok: true, data: existing };
      }
    }

    const runtime = new AgentConversationRuntime(this, args);
    if (cacheKey) {
      this.#runtimes.set(cacheKey, runtime);
    }

    return { ok: true, data: runtime };
  }

  /** @internal */
  onMessagesUpdated(listener: (data: AgentChatMessagesUpdated) => void): () => void {
    return this._emitter.on('agent_chat.messages.updated', ({ data }) => {
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

  getConversation({ agentId, conversationId, key }: { agentId: string; conversationId?: string; key?: string }):
    | {
        conversationId?: string;
        messages: AgentMessage[];
        key: string;
        isRunning: boolean;
        typing?: ConversationEntry['typing'];
        status: ConversationEntry['status'];
        hasMore: boolean;
        pagination: AgentChatPagination;
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

  async respondToAction(args: RespondToActionArgs): Result<RespondToActionResult, NovuError | AgentChatPlanLimitError> {
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

        return this.#agentChatService.respondToAction({
          agentId: args.agentId,
          conversationId,
          actionId,
          agentHash: args.agentHash,
        });
      }
    );
  }

  async sendAction(args: SendActionArgs): Result<SendActionResult, NovuError | AgentChatPlanLimitError> {
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

        return this.#agentChatService.sendAction({
          agentId: args.agentId,
          conversationId,
          actionId,
          sourceMessageId,
          value: args.value,
          agentHash: args.agentHash,
        });
      }
    );
  }

  /**
   * Load the newest history page into the local holder.
   * The holder key is the public conversation id.
   */
  async loadConversation(args: LoadConversationArgs): Result<LoadConversationResult> {
    return this.callWithSession(async () => {
      try {
        const page = await this.#agentChatService.getEvents({
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
        return { error: new NovuError('Failed to load agent chat conversation', error) };
      }
    });
  }

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
          const page = await this.#agentChatService.getEvents({
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
          return { error: new NovuError('Failed to load older agent chat messages', error) };
        }
      });
    });
  }

  async sendMessage(args: SendMessageArgs): Result<SendMessageResult, NovuError | AgentChatPlanLimitError> {
    return this.callWithSession<SendMessageResult, NovuError | AgentChatPlanLimitError>(async () => {
      const key = args.key ?? args.conversationId ?? createLocalConversationKey();
      const entry = this.#resolveSendEntry(args, key);
      const optimisticId = this.#store.appendSending(entry, args.text);

      return this.#store.withCreateClaim(entry, args.conversationId, async (conversationId) => {
        try {
          const data = await this.#agentChatService.sendMessage({
            agentId: args.agentId,
            text: args.text,
            conversationId,
            agentHash: args.agentHash,
            metadata: args.metadata,
          });

          this.#store.markSent(entry, {
            optimisticMessageId: optimisticId,
            serverMessageId: data.messageId,
            conversationId: data.identifier,
          });

          // Live WS can arrive before the HTTP ack claims conversationId; those
          // envelopes are dropped by #applyLiveEnvelope. Catch up immediately.
          this.#requestCatchUp();

          return {
            data: {
              conversationId: data.identifier,
              messageId: data.messageId,
            },
          };
        } catch (error) {
          this.#store.markFailed(entry, optimisticId);

          if (error instanceof AgentChatPlanLimitError) {
            return { error };
          }

          return { error: new NovuError('Failed to send agent chat message', error) };
        }
      });
    });
  }

  /**
   * Shared session + conversation + plan-limit wrapper for `respondToAction` and `sendAction`.
   * The two public methods stay separate: they take different ids and extra fields.
   */
  async #withConversationAction(
    args: { agentId: string; conversationId?: string; key?: string },
    missingConversationMessage: string,
    failureMessage: string,
    run: (entry: ConversationEntry, conversationId: string) => Promise<{ identifier: string } | { error: NovuError }>
  ): Result<{ conversationId: string }, NovuError | AgentChatPlanLimitError> {
    return this.callWithSession<{ conversationId: string }, NovuError | AgentChatPlanLimitError>(async () => {
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
        if (error instanceof AgentChatPlanLimitError) {
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

  /**
   * Find the holder for a send.
   * Reject a key when the holder belongs to another agent or another claimed conversation.
   */
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

    // If the key is stale, do not call getOrCreate with that key. That returns the wrong holder.
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
   * Live WS path: apply envelopes into open conversations only.
   * Unknown conversations are dropped — mount/resume creates the entry.
   * During reconnect catch-up for a conversation, only that conversation's envelopes buffer.
   */
  #handleAgentEvent(payload: unknown): void {
    if (!isAgentEventEnvelope(payload)) {
      console.warn('[Novu] Dropped malformed agent event envelope');

      return;
    }

    const envelope = payload;
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

  #emitMessagesUpdated(entry: ConversationEntry, change: AgentChatChange): void {
    this._emitter.emit('agent_chat.messages.updated', {
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

      for (let pageIndex = 0; pageIndex < CATCH_UP_PAGE_LIMIT; pageIndex += 1) {
        const page = await this.#agentChatService.getEvents({
          conversationId,
          ...(before ? { before } : {}),
        });
        const envelopes = [...page.events].sort((left, right) => left.sequence - right.sequence);
        missed.push(...envelopes);

        const oldestInPage = envelopes[0]?.sequence;
        if (page.olderCursor == null || oldestInPage == null || oldestInPage <= knownThrough) {
          completed = true;
          break;
        }

        before = page.olderCursor;
      }

      if (!completed) {
        // On catch-up failure the conversation stays stale and errored rather than showing messages across a known gap.
        discardBufferedEnvelopes = true;
        const catchUpError = new NovuError(
          'Agent chat reconnect catch-up exceeded the safety page limit; conversation history may be incomplete',
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
      const catchUpError = new NovuError('Failed to recover agent chat conversation after reconnect', error);
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
