import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { AgentChatPlanLimitError, AgentChatService, InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import type { BaseSocketInterface } from '../ws/base-socket';
import { AgentChatStore, type ConversationEntry, createLocalConversationKey } from './agent-chat-store';
import { type AgentMessage, derivePendingActions } from './agent-message.types';
import type {
  CancelRunArgs,
  CancelRunResult,
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

export class AgentChat extends BaseModule {
  #agentChatService: AgentChatService;
  #store: AgentChatStore;
  #socket: Pick<BaseSocketInterface, 'connect'>;
  #liveSubscriberCount = 0;
  /**
   * Non-null while a reconnect catch-up is in flight: live envelopes are buffered here
   * and applied after the HTTP page is absorbed. Serialized via `#catchUpChain`.
   */
  #catchUpBuffer: AgentEventEnvelope[] | null = null;
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
          change,
        },
      });
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
    this.#store.clear();
    this.#catchUpBuffer = null;
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
   * Terminate the active server-side agent run for this conversation.
   * This sends a cancel command over REST — it does not disconnect the live socket.
   * Socket subscription cleanup is handled separately by `unsubscribe()` on unmount.
   */
  async cancelRun(args: CancelRunArgs): Result<CancelRunResult, NovuError | AgentChatPlanLimitError> {
    return this.callWithSession<CancelRunResult, NovuError | AgentChatPlanLimitError>(async () => {
      const entry = this.#resolveFetchEntry(args);
      const conversationId = entry?.conversationId;
      if (!entry || !conversationId) {
        return {
          error: new NovuError('Cannot cancel run without a conversation id', new Error('missing conversation id')),
        };
      }

      try {
        const data = await this.#agentChatService.cancelRun({
          agentId: args.agentId,
          conversationId,
          idempotencyKey: args.idempotencyKey,
          agentHash: args.agentHash,
        });

        this.#requestCatchUp();

        return { data };
      } catch (error) {
        if (error instanceof AgentChatPlanLimitError) {
          return { error };
        }

        return { error: new NovuError('Failed to cancel agent run', error) };
      }
    });
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

      try {
        const page = await this.#agentChatService.getEvents({
          conversationId: entry.conversationId,
          before: entry.olderCursor,
        });
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
   * During reconnect catch-up, all live envelopes are buffered until HTTP finishes.
   */
  #handleAgentEvent(envelope: AgentEventEnvelope): void {
    if (!envelope.conversationIdentifier) {
      return;
    }

    if (this.#catchUpBuffer) {
      this.#catchUpBuffer.push(envelope);

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

    this.#catchUpBuffer = [];

    try {
      await Promise.all(
        [...byConversationId.entries()].map(([conversationId, holders]) =>
          this.#catchUpConversation(conversationId, holders)
        )
      );
    } finally {
      const buffered = this.#catchUpBuffer ?? [];
      this.#catchUpBuffer = null;

      for (const envelope of buffered) {
        this.#applyLiveEnvelope(envelope);
      }
    }
  }

  async #catchUpConversation(conversationId: string, holders: ConversationEntry[]): Promise<void> {
    try {
      const activeHolders = holders
        .map((holder) => this.#store.get(holder.key))
        .filter((entry): entry is ConversationEntry => entry != null && entry.conversationId === conversationId);

      if (activeHolders.length === 0) {
        return;
      }

      // Page toward older events until we reach already-known sequence territory.
      // One newest page is not enough when the offline gap exceeds the server page size.
      const knownThrough = Math.min(...activeHolders.map((entry) => entry.lastSequence));
      const missed: AgentEventEnvelope[] = [];
      let before: string | undefined;

      for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
        const page = await this.#agentChatService.getEvents({
          conversationId,
          ...(before ? { before } : {}),
        });
        const envelopes = [...page.events].sort((left, right) => left.sequence - right.sequence);
        missed.push(...envelopes);

        const oldestInPage = envelopes[0]?.sequence;
        if (page.olderCursor == null || oldestInPage == null || oldestInPage <= knownThrough) {
          break;
        }

        before = page.olderCursor;
      }

      // Apply oldest→newest so message order stays chronological across pages.
      missed.sort((left, right) => left.sequence - right.sequence);

      for (const holder of activeHolders) {
        const entry = this.#store.get(holder.key);
        if (!entry || entry.conversationId !== conversationId) {
          continue;
        }

        for (const envelope of missed) {
          this.#store.applyLiveEnvelope(entry, envelope);
        }
      }
    } catch {
      // Best-effort catch-up; buffered live envelopes still flush in the outer finally.
    }
  }
}
