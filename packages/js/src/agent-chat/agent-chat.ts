import type { AgentEventEnvelope, AgentMessage } from '@novu/agent-event-protocol';
import { derivePendingApprovals } from '@novu/agent-event-protocol';
import { AgentChatService, InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import type { BaseSocketInterface } from '../ws/base-socket';
import { AgentChatStore, type ConversationEntry, createLocalConversationKey } from './agent-chat-store';
import type {
  FetchMoreArgs,
  FetchMoreResult,
  LoadConversationArgs,
  LoadConversationResult,
  RespondToApprovalArgs,
  RespondToApprovalResult,
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
    this.#store = new AgentChatStore((entry) => {
      this._emitter.emit('agent_chat.messages.updated', {
        data: {
          agentId: entry.agentId,
          conversationId: entry.conversationId,
          key: entry.key,
          messages: entry.messages,
          isRunning: entry.isRunning,
          status: entry.status,
          hasMore: entry.olderCursor != null,
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
      status: entry.status,
      hasMore: entry.olderCursor != null,
    };
  }

  async respondToApproval(args: RespondToApprovalArgs): Result<RespondToApprovalResult> {
    return this.callWithSession(async () => {
      const entry = this.#resolveFetchEntry(args);
      if (!entry?.conversationId) {
        return {
          error: new NovuError(
            'Cannot respond to approval without a conversation id',
            new Error('missing conversation id')
          ),
        };
      }

      const pending = derivePendingApprovals(entry.messages).find((part) => part.approvalId === args.approvalId);
      if (!pending) {
        return { error: new NovuError('Pending approval not found', new Error('pending approval not found')) };
      }

      const actionId = args.decision === 'approved' ? pending.approveActionId : pending.denyActionId;
      if (!actionId) {
        return {
          error: new NovuError(
            'Pending approval is missing action id',
            new Error('pending approval missing action id')
          ),
        };
      }

      try {
        const data = await this.#agentChatService.respondToApproval({
          agentId: args.agentId,
          conversationId: entry.conversationId,
          actionId,
        });

        return {
          data: {
            conversationId: data.identifier,
          },
        };
      } catch (error) {
        return { error: new NovuError('Failed to respond to approval', error) };
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

  async sendMessage(args: SendMessageArgs): Result<SendMessageResult> {
    return this.callWithSession(async () => {
      const key = args.key ?? args.conversationId ?? createLocalConversationKey();
      const entry = this.#resolveSendEntry(args, key);
      const optimisticId = this.#store.appendSending(entry, args.text);

      return this.#store.withCreateClaim(entry, args.conversationId, async (conversationId) => {
        try {
          const data = await this.#agentChatService.sendMessage({
            agentId: args.agentId,
            text: args.text,
            conversationId,
          });

          this.#store.markSent(entry, {
            optimisticMessageId: optimisticId,
            serverMessageId: data.messageId,
            conversationId: data.identifier,
          });

          return {
            data: {
              conversationId: data.identifier,
              messageId: data.messageId,
            },
          };
        } catch (error) {
          this.#store.markFailed(entry, optimisticId);

          return { error: new NovuError('Failed to send agent chat message', error) };
        }
      });
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
      const page = await this.#agentChatService.getEvents({ conversationId });
      // Fold only missed live envelopes. Do not rebuild from the newest history page —
      // that would reorder/drop already-loaded older pages and reset `olderCursor`.
      const envelopes = [...page.events].sort((left, right) => left.sequence - right.sequence);

      for (const holder of holders) {
        const entry = this.#store.get(holder.key);
        if (!entry || entry.conversationId !== conversationId) {
          continue;
        }

        for (const envelope of envelopes) {
          this.#store.applyLiveEnvelope(entry, envelope);
        }
      }
    } catch {
      // Best-effort catch-up; buffered live envelopes still flush in the outer finally.
    }
  }
}
