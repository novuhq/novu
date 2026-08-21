import type { AgentChatPlanLimitError } from '../api';
import { NovuError } from '../utils/errors';
import type { AgentChat } from './agent-chat';
import { createLocalConversationKey } from './agent-chat-store';
import type { AgentToolApprovalDecision } from './agent-message.types';
import { derivePendingActions } from './agent-message.types';
import type {
  AgentConversationRunSnapshot,
  AgentConversationSessionStatus,
  AgentConversationSnapshot,
  ConversationArgs,
  ConversationResult,
  SendMessageInput,
} from './conversation-runtime.types';

const EMPTY_RUN: AgentConversationRunSnapshot = Object.freeze({ isRunning: false });

function freezeSnapshot(snapshot: AgentConversationSnapshot): AgentConversationSnapshot {
  return Object.freeze({
    ...snapshot,
    run: Object.freeze({ ...snapshot.run }),
    pagination: Object.freeze({ ...snapshot.pagination }),
    messages: Object.freeze(snapshot.messages),
    pendingActions: Object.freeze(snapshot.pendingActions),
  });
}

function createEmptySnapshot(key: string, conversationId?: string): AgentConversationSnapshot {
  return freezeSnapshot({
    key,
    conversationId,
    status: conversationId ? 'loading' : 'ready',
    run: EMPTY_RUN,
    conversationStatus: 'active',
    pagination: { hasMore: false },
    messages: [],
    pendingActions: [],
  });
}

function normalizeSendMessageInput(input: SendMessageInput): { text: string } {
  if (typeof input === 'string') {
    return { text: input };
  }

  return { text: input.text };
}

/**
 * Framework-independent conversation runtime for one agent thread.
 * Owns identity, immutable snapshots, and bound actions.
 */
export class AgentConversationRuntime {
  readonly agentId: string;
  readonly key: string;

  #agentChat: AgentChat;
  #agentHash?: string;
  #conversationId?: string;
  #snapshot: AgentConversationSnapshot;
  #listeners = new Set<(snapshot: AgentConversationSnapshot) => void>();
  #stopListening?: () => void;
  #disposed = false;
  #registeredConversationKey?: string;

  constructor(agentChat: AgentChat, args: ConversationArgs) {
    this.#agentChat = agentChat;
    this.agentId = args.agentId;
    this.#agentHash = args.agentHash;
    this.#conversationId = args.conversationId;
    this.key = args.conversationId ?? createLocalConversationKey();
    this.#snapshot = createEmptySnapshot(this.key, args.conversationId);

    this.#agentChat.subscribe();
    this.#stopListening = this.#agentChat.onMessagesUpdated((data) => {
      if (data.key !== this.key) {
        return;
      }

      if (data.conversationId && !this.#conversationId) {
        this.#conversationId = data.conversationId;
        this.#registerByConversationId(data.conversationId);
      }

      this.#publishFromStore({
        messages: data.messages,
        isRunning: data.isRunning,
        typing: data.typing,
        status: data.status,
        hasMore: data.hasMore,
        conversationId: data.conversationId,
        sessionStatus:
          this.#snapshot.status === 'loading' || this.#snapshot.status === 'fetching' ? this.#snapshot.status : 'ready',
      });
    });

    if (args.conversationId) {
      void this.load();
    }
  }

  getSnapshot(): AgentConversationSnapshot {
    return this.#snapshot;
  }

  subscribe(listener: (snapshot: AgentConversationSnapshot) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#snapshot);

    return () => {
      this.#listeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    this.#stopListening?.();
    this.#stopListening = undefined;
    this.#agentChat.unregisterRuntime(this);
    this.#agentChat.unsubscribe();
    this.#listeners.clear();
  }

  async load(): Promise<{
    data?: { conversationId: string; messages: AgentConversationSnapshot['messages']; hasMore: boolean };
    error?: NovuError;
  }> {
    const conversationId = this.#conversationId;
    if (!conversationId) {
      return {
        error: new NovuError(
          'Cannot load conversation without a conversation id',
          new Error('missing conversation id')
        ),
      };
    }

    this.#publishSessionStatus('loading');

    const response = await this.#agentChat.loadConversation({
      agentId: this.agentId,
      conversationId,
    });

    if (response.error) {
      this.#publishError(response.error);
      this.#publishSessionStatus('ready');

      return response;
    }

    if (response.data) {
      this.#publishFromStore({
        messages: response.data.messages,
        isRunning: this.#snapshot.run.isRunning,
        typing: this.#snapshot.run.typing,
        status: this.#snapshot.conversationStatus,
        hasMore: response.data.hasMore,
        conversationId: response.data.conversationId,
        sessionStatus: 'ready',
      });
    }

    return response;
  }

  async fetchMore(): Promise<{
    data?: { messages: AgentConversationSnapshot['messages']; hasMore: boolean };
    error?: NovuError;
  }> {
    this.#publishSessionStatus('fetching');

    const response = await this.#agentChat.fetchMore({
      agentId: this.agentId,
      key: this.key,
      conversationId: this.#conversationId,
    });

    if (response.error) {
      this.#publishError(response.error);
      this.#publishSessionStatus('ready');

      return response;
    }

    if (response.data) {
      const store = this.#agentChat.getConversation({
        agentId: this.agentId,
        key: this.key,
        conversationId: this.#conversationId,
      });

      this.#publishFromStore({
        messages: response.data.messages,
        isRunning: store?.isRunning ?? this.#snapshot.run.isRunning,
        typing: store?.typing ?? this.#snapshot.run.typing,
        status: store?.status ?? this.#snapshot.conversationStatus,
        hasMore: response.data.hasMore,
        conversationId: store?.conversationId ?? this.#conversationId,
        sessionStatus: 'ready',
      });
    }

    return response;
  }

  async sendMessage(
    input: SendMessageInput
  ): Promise<{ data?: { conversationId: string; messageId: string }; error?: NovuError | AgentChatPlanLimitError }> {
    const { text } = normalizeSendMessageInput(input);

    const response = await this.#agentChat.sendMessage({
      agentId: this.agentId,
      agentHash: this.#agentHash,
      text,
      key: this.key,
      conversationId: this.#conversationId,
    });

    if (response.error) {
      this.#publishError(response.error);

      return response;
    }

    if (response.data?.conversationId) {
      this.#conversationId = response.data.conversationId;
      this.#registerByConversationId(response.data.conversationId);
    }

    return response;
  }

  async respondToAction(args: {
    actionId: string;
    decision: AgentToolApprovalDecision;
  }): Promise<{ data?: { conversationId: string }; error?: NovuError | AgentChatPlanLimitError }> {
    const response = await this.#agentChat.respondToAction({
      agentId: this.agentId,
      agentHash: this.#agentHash,
      key: this.key,
      conversationId: this.#conversationId,
      actionId: args.actionId,
      decision: args.decision,
    });

    if (response.error) {
      this.#publishError(response.error);
    }

    return response;
  }

  async sendAction(args: {
    actionId: string;
    sourceMessageId: string;
    value?: string;
  }): Promise<{ data?: { conversationId: string }; error?: NovuError | AgentChatPlanLimitError }> {
    const response = await this.#agentChat.sendAction({
      agentId: this.agentId,
      agentHash: this.#agentHash,
      key: this.key,
      conversationId: this.#conversationId,
      actionId: args.actionId,
      sourceMessageId: args.sourceMessageId,
      value: args.value,
    });

    if (response.error) {
      this.#publishError(response.error);
    }

    return response;
  }

  cancelRun(): ConversationResult<void> {
    return {
      ok: false,
      error: new NovuError('Run cancellation is not supported yet', new Error('cancelRun is not implemented')),
    };
  }

  /** @internal */
  get conversationId(): string | undefined {
    return this.#conversationId;
  }

  /** @internal */
  getRuntimeCacheKey(): string | undefined {
    return this.#conversationId ? `${this.agentId}::${this.#conversationId}` : undefined;
  }

  /** @internal */
  adoptConversationId(conversationId: string): void {
    if (this.#conversationId === conversationId) {
      return;
    }

    this.#conversationId = conversationId;
    this.#registerByConversationId(conversationId);
  }

  #registerByConversationId(conversationId: string): void {
    const cacheKey = `${this.agentId}::${conversationId}`;
    if (this.#registeredConversationKey === cacheKey) {
      return;
    }

    this.#registeredConversationKey = cacheKey;
    this.#agentChat.registerRuntime(cacheKey, this);
  }

  #publishSessionStatus(status: AgentConversationSessionStatus): void {
    if (this.#snapshot.status === status) {
      return;
    }

    this.#publish({
      ...this.#snapshot,
      status,
    });
  }

  #publishError(error: NovuError | AgentChatPlanLimitError): void {
    this.#publish({
      ...this.#snapshot,
      error,
    });
  }

  #publishFromStore(args: {
    messages: AgentConversationSnapshot['messages'];
    isRunning: boolean;
    typing?: AgentConversationRunSnapshot['typing'];
    status: AgentConversationSnapshot['conversationStatus'];
    hasMore: boolean;
    conversationId?: string;
    sessionStatus: AgentConversationSessionStatus;
  }): void {
    this.#publish({
      key: this.key,
      conversationId: args.conversationId ?? this.#conversationId,
      status: args.sessionStatus,
      run: {
        isRunning: args.isRunning,
        typing: args.typing,
      },
      conversationStatus: args.status,
      pagination: {
        hasMore: args.hasMore,
      },
      messages: args.messages,
      pendingActions: derivePendingActions([...args.messages]),
      error: undefined,
    });
  }

  #publish(next: AgentConversationSnapshot): void {
    const frozen = freezeSnapshot(next);
    this.#snapshot = frozen;

    for (const listener of this.#listeners) {
      listener(frozen);
    }
  }
}
