import type { WebChatPlanLimitError } from '../api';
import { NovuError } from '../utils/errors';
import type { WebChat } from './web-chat';
import { createLocalConversationKey } from './web-chat-store';
import type { AgentToolApprovalDecision } from './agent-message.types';
import { derivePendingActions } from './agent-message.types';
import type {
  AgentConversationPaginationSnapshot,
  AgentConversationPublicationMeta,
  AgentConversationRunSnapshot,
  AgentConversationSessionStatus,
  AgentConversationSnapshot,
  ConversationArgs,
  ConversationResult,
  SendMessageInput,
} from './conversation-runtime.types';
import { runtimeCacheKey } from './runtime-cache-key';

const EMPTY_RUN: AgentConversationRunSnapshot = Object.freeze({ isRunning: false });

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  Object.freeze(value);

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return value;
}

function freezeSnapshot(snapshot: AgentConversationSnapshot): AgentConversationSnapshot {
  return deepFreeze({
    ...snapshot,
    run: {
      ...snapshot.run,
      typing: snapshot.run.typing ? { ...snapshot.run.typing } : undefined,
    },
    pagination: { ...snapshot.pagination },
    messages: snapshot.messages,
    pendingActions: snapshot.pendingActions,
  }) as AgentConversationSnapshot;
}

function createEmptySnapshot(key: string, conversationId?: string): AgentConversationSnapshot {
  return freezeSnapshot({
    key,
    conversationId,
    status: conversationId ? 'loading' : 'ready',
    run: EMPTY_RUN,
    conversationStatus: 'active',
    pagination: { hasMore: false, status: 'idle' },
    messages: [],
    pendingActions: [],
    isRecovering: false,
  });
}

const SERVER_SNAPSHOT = createEmptySnapshot('ssr');

function cloneSnapshot(snapshot: AgentConversationSnapshot): AgentConversationSnapshot {
  return {
    ...snapshot,
    run: {
      ...snapshot.run,
      typing: snapshot.run.typing ? { ...snapshot.run.typing } : undefined,
    },
    pagination: { ...snapshot.pagination },
    messages: structuredClone(snapshot.messages),
    pendingActions: structuredClone(snapshot.pendingActions),
  };
}

function normalizeSendMessageInput(input: SendMessageInput): { text: string; metadata?: Record<string, unknown> } {
  if (typeof input === 'string') {
    return { text: input };
  }

  return { text: input.text, metadata: input.metadata };
}

function storePagination(hasMore: boolean, status: AgentConversationPaginationSnapshot['status'] = 'idle') {
  return { hasMore, status };
}

/**
 * Framework-independent conversation runtime for one agent thread.
 * Owns identity, immutable snapshots, and bound actions.
 */
export class AgentConversationRuntime {
  readonly agentId: string;
  readonly key: string;

  #webChat: WebChat;
  #agentHash?: string;
  #conversationId?: string;
  #snapshot: AgentConversationSnapshot;
  #listeners = new Set<(snapshot: AgentConversationSnapshot, meta?: AgentConversationPublicationMeta) => void>();
  #stopListening?: () => void;
  #disposed = false;
  #registeredConversationKey?: string;

  constructor(webChat: WebChat, args: ConversationArgs) {
    this.#webChat = webChat;
    this.agentId = args.agentId;
    this.#agentHash = args.agentHash;
    this.#conversationId = args.conversationId;
    this.key = args.conversationId ?? createLocalConversationKey();
    this.#snapshot = createEmptySnapshot(this.key, args.conversationId);

    this.#webChat.subscribe();
    this.#stopListening = this.#webChat.onMessagesUpdated((data) => {
      if (this.#disposed || data.key !== this.key) {
        return;
      }

      if (data.conversationId && !this.#conversationId) {
        this.#conversationId = data.conversationId;
        this.#registerByConversationId(data.conversationId);
      }

      this.#publishFromStore(
        {
          messages: data.messages,
          isRunning: data.isRunning,
          typing: data.typing,
          status: data.status,
          pagination: data.pagination,
          isRecovering: data.isRecovering,
          catchUpError: data.catchUpError,
          conversationId: data.conversationId,
          sessionStatus:
            this.#snapshot.status === 'loading' || this.#snapshot.status === 'fetching'
              ? this.#snapshot.status
              : 'ready',
        },
        { change: data.change }
      );
    });

    if (args.conversationId) {
      void this.load();
    }
  }

  getSnapshot(): AgentConversationSnapshot {
    return this.#snapshot;
  }

  getServerSnapshot(): AgentConversationSnapshot {
    return SERVER_SNAPSHOT;
  }

  subscribe(
    listener: (snapshot: AgentConversationSnapshot, meta?: AgentConversationPublicationMeta) => void
  ): () => void {
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
    this.#webChat.unregisterRuntime(this);
    this.#webChat.unsubscribe();
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

    const response = await this.#webChat.loadConversation({
      agentId: this.agentId,
      conversationId,
    });

    if (response.error) {
      this.#publishError(response.error);
      this.#publishSessionStatus('ready');

      return response;
    }

    if (response.data) {
      const store = this.#webChat.getConversation({
        agentId: this.agentId,
        key: this.key,
        conversationId: response.data.conversationId,
      });

      this.#publishFromStore(
        {
          messages: response.data.messages,
          isRunning: store?.isRunning ?? this.#snapshot.run.isRunning,
          typing: store?.typing ?? this.#snapshot.run.typing,
          status: store?.status ?? this.#snapshot.conversationStatus,
          pagination: store?.pagination ?? storePagination(response.data.hasMore),
          isRecovering: store?.isRecovering ?? false,
          catchUpError: store?.catchUpError,
          conversationId: response.data.conversationId,
          sessionStatus: 'ready',
        },
        { historyLoaded: true }
      );
    }

    return response;
  }

  async fetchMore(): Promise<{
    data?: { messages: AgentConversationSnapshot['messages']; hasMore: boolean };
    error?: NovuError;
  }> {
    this.#publishSessionStatus('fetching');

    const response = await this.#webChat.fetchMore({
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
      const store = this.#webChat.getConversation({
        agentId: this.agentId,
        key: this.key,
        conversationId: this.#conversationId,
      });

      this.#publishFromStore({
        messages: response.data.messages,
        isRunning: store?.isRunning ?? this.#snapshot.run.isRunning,
        typing: store?.typing ?? this.#snapshot.run.typing,
        status: store?.status ?? this.#snapshot.conversationStatus,
        pagination: store?.pagination ?? storePagination(response.data.hasMore),
        isRecovering: store?.isRecovering ?? this.#snapshot.isRecovering,
        catchUpError: store?.catchUpError,
        conversationId: store?.conversationId ?? this.#conversationId,
        sessionStatus: 'ready',
      });
    }

    return response;
  }

  async sendMessage(
    input: SendMessageInput
  ): Promise<{ data?: { conversationId: string; messageId: string }; error?: NovuError | WebChatPlanLimitError }> {
    const { text, metadata } = normalizeSendMessageInput(input);

    const response = await this.#webChat.sendMessage({
      agentId: this.agentId,
      agentHash: this.#agentHash,
      text,
      metadata,
      key: this.key,
      conversationId: this.#conversationId,
    });

    if (response.error) {
      this.#publishError(response.error);

      return response;
    }

    if (response.data?.conversationId && !this.#disposed) {
      this.#conversationId = response.data.conversationId;
      this.#registerByConversationId(response.data.conversationId);
    }

    return response;
  }

  async respondToAction(args: {
    actionId: string;
    decision: AgentToolApprovalDecision;
  }): Promise<{ data?: { conversationId: string }; error?: NovuError | WebChatPlanLimitError }> {
    const response = await this.#webChat.respondToAction({
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
  }): Promise<{ data?: { conversationId: string }; error?: NovuError | WebChatPlanLimitError }> {
    const response = await this.#webChat.sendAction({
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

  async retryMessage(
    messageId: string
  ): Promise<{ data?: { conversationId: string; messageId: string }; error?: NovuError | WebChatPlanLimitError }> {
    const response = await this.#webChat.retryMessage({
      agentId: this.agentId,
      agentHash: this.#agentHash,
      key: this.key,
      conversationId: this.#conversationId,
      messageId,
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
    return this.#conversationId ? runtimeCacheKey(this.agentId, this.#conversationId) : undefined;
  }

  #registerByConversationId(conversationId: string): void {
    if (this.#disposed) {
      return;
    }

    const cacheKey = runtimeCacheKey(this.agentId, conversationId);
    if (this.#registeredConversationKey === cacheKey) {
      return;
    }

    this.#registeredConversationKey = cacheKey;
    this.#webChat.registerRuntime(cacheKey, this);
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

  #publishError(error: NovuError | WebChatPlanLimitError): void {
    this.#publish({
      ...this.#snapshot,
      error,
    });
  }

  #publishFromStore(
    args: {
      messages: AgentConversationSnapshot['messages'];
      isRunning: boolean;
      typing?: AgentConversationRunSnapshot['typing'];
      status: AgentConversationSnapshot['conversationStatus'];
      pagination: AgentConversationPaginationSnapshot;
      isRecovering: boolean;
      catchUpError?: NovuError;
      conversationId?: string;
      sessionStatus: AgentConversationSessionStatus;
    },
    meta?: AgentConversationPublicationMeta
  ): void {
    this.#publish(
      {
        key: this.key,
        conversationId: args.conversationId ?? this.#conversationId,
        status: args.sessionStatus,
        run: {
          isRunning: args.isRunning,
          typing: args.typing,
        },
        conversationStatus: args.status,
        pagination: args.pagination,
        messages: args.messages,
        pendingActions: derivePendingActions([...args.messages]),
        isRecovering: args.isRecovering,
        catchUpError: args.catchUpError,
        error: undefined,
      },
      meta
    );
  }

  #publish(next: AgentConversationSnapshot, meta?: AgentConversationPublicationMeta): void {
    if (this.#disposed) {
      return;
    }

    const frozen = freezeSnapshot(cloneSnapshot(next));
    this.#snapshot = frozen;

    for (const listener of this.#listeners) {
      listener(frozen, meta);
    }
  }
}
