import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type { NovuError } from '../utils/errors';
import {
  type AgentConversationState,
  type AgentMessage,
  createInitialAgentConversationState,
} from './agent-message.types';
import { derivePendingActions, pendingActionKey } from './derive-pending-actions';
import { appendUserMessage, applyEnvelope, applyEnvelopes } from './apply-envelope';
import { mintClientId } from './idempotency';
import type { WebChatChange, WebChatChangeSource, WebChatPaginationStatus, FetchMoreResult } from './types';

type McpConnectionResult = {
  status: 'connected' | 'failed';
  message?: string;
};

/**
 * Stable local identity for one conversation session.
 * The object reference does not change. Timeline fields are overwritten in place.
 */
export type ConversationEntry = AgentConversationState & {
  agentId: string;
  /** Public conversation id after create, or when the session resumes. */
  conversationId?: string;
  /**
   * Map key for this session. The key does not change.
   * New chats use `local_*`. Resume uses the `conv_*` id.
   */
  key: string;
  /**
   * Cursor toward older history (`before` on the next page). Null when unknown,
   * exhausted, or before any history load.
   */
  olderCursor: string | null;
  /**
   * Actions already reported as new. An action id is never raised twice,
   * so a resolved action must not fall out and be reported again.
   */
  reportedActionIds: Set<string>;
  /** Terminal MCP results retained while history pages load independently. */
  mcpConnectionResults: Map<string, McpConnectionResult>;
  /**
   * Latest `channel.edit` / `channel.delete` per message id.
   * History pages apply in isolation, so a mutation on a newer page must still
   * apply when `fetchMore` prepends the original message.
   */
  messageMutations: Map<string, AgentEventEnvelope>;
  /** True while reconnect recovery is in progress. */
  isRecovering: boolean;
  /** Set when reconnect recovery hits the page limit or HTTP fails. Cleared on success. */
  catchUpError?: NovuError;
  /** One create at a time on this session until a conversation id exists. */
  pendingCreate?: Promise<void>;
  /** History pagination state for `fetchMore`. */
  paginationStatus: WebChatPaginationStatus;
  /** Invalidates in-flight `fetchMore` status updates after history reload. */
  paginationEpoch: number;
  /** Coalesces overlapping `fetchMore` calls on this session. */
  pendingFetchMore?: Promise<{ data?: FetchMoreResult; error?: NovuError }>;
};

export function createLocalConversationKey(): string {
  return mintClientId('local');
}

function createOptimisticMessageId(): string {
  return mintClientId('opt');
}

function messagesAddedSince(previous: AgentMessage[], next: AgentMessage[]): AgentMessage[] {
  const known = new Set(previous.map((message) => message.id));

  return next.filter((message) => !known.has(message.id));
}

function applyState(entry: ConversationEntry, next: AgentConversationState): void {
  Object.assign(entry, {
    messages: next.messages,
    isRunning: next.isRunning,
    typing: next.typing,
    status: next.status,
    lastSequence: next.lastSequence,
    error: next.error,
    activeAssistantMessageId: next.activeAssistantMessageId,
  });
}

/**
 * In-memory cache for Web Chat conversations.
 * `WebChat` writes here around HTTP calls. The map key is the session `key`.
 */
export class WebChatStore {
  #byKey = new Map<string, ConversationEntry>();
  #onUpdate: (entry: ConversationEntry, change: WebChatChange) => void;

  constructor(onUpdate: (entry: ConversationEntry, change: WebChatChange) => void) {
    this.#onUpdate = onUpdate;
  }

  /**
   * Notify listeners with the snapshot and what this update added.
   * Only this store can tell live, history, and local updates apart.
   */
  #publish(entry: ConversationEntry, source: WebChatChangeSource, addedMessages: AgentMessage[]): void {
    const newActions = derivePendingActions(entry.messages).filter(
      (action) => !entry.reportedActionIds.has(pendingActionKey(action))
    );
    for (const action of newActions) {
      entry.reportedActionIds.add(pendingActionKey(action));
    }

    this.#onUpdate(entry, { ...source, addedMessages, newActions });
  }

  /**
   * Mark a backfilled page's actions as already reported.
   * Paging backwards is never new activity.
   */
  #suppressActions(entry: ConversationEntry, messages: AgentMessage[]): void {
    for (const action of derivePendingActions(messages)) {
      entry.reportedActionIds.add(pendingActionKey(action));
    }
  }

  #recordMcpConnectionResults(entry: ConversationEntry, envelopes: AgentEventEnvelope[]): void {
    for (const { event } of envelopes) {
      if (event.type === 'mcp-connection-result') {
        entry.mcpConnectionResults.set(event.actionId, {
          status: event.status,
          message: event.message,
        });
      }
    }
  }

  #applyMcpConnectionResults(entry: ConversationEntry, messages: AgentMessage[]): AgentMessage[] {
    if (entry.mcpConnectionResults.size === 0) {
      return messages;
    }

    return messages.map((message) => ({
      ...message,
      parts: message.parts.map((part) => {
        if (part.type !== 'mcp-connection') {
          return part;
        }

        const result = entry.mcpConnectionResults.get(part.actionId);

        return result ? { ...part, state: result.status, message: result.message } : part;
      }),
    }));
  }

  #recordMessageMutations(entry: ConversationEntry, envelopes: AgentEventEnvelope[]): void {
    for (const envelope of envelopes) {
      const { event } = envelope;
      if (event.type !== 'channel.edit' && event.type !== 'channel.delete') {
        continue;
      }

      const existing = entry.messageMutations.get(event.messageId);
      if (existing && existing.sequence > envelope.sequence) {
        continue;
      }

      entry.messageMutations.set(event.messageId, envelope);
    }
  }

  #applyMessageMutations(entry: ConversationEntry, messages: AgentMessage[]): AgentMessage[] {
    if (entry.messageMutations.size === 0) {
      return messages;
    }

    return applyEnvelopes(
      { ...createInitialAgentConversationState(), messages },
      [...entry.messageMutations.values()]
    ).messages;
  }

  #overlayMessages(entry: ConversationEntry, messages: AgentMessage[]): AgentMessage[] {
    return this.#applyMcpConnectionResults(entry, this.#applyMessageMutations(entry, messages));
  }

  clear(): void {
    this.#byKey.clear();
  }

  get(key: string): ConversationEntry | undefined {
    return this.#byKey.get(key);
  }

  /** Find a session that already claimed this conversation id. */
  getByConversationId(agentId: string, conversationId: string): ConversationEntry | undefined {
    for (const entry of this.#byKey.values()) {
      if (entry.agentId === agentId && entry.conversationId === conversationId) {
        return entry;
      }
    }

    return undefined;
  }

  /** All sessions that already claimed this conversation id (create and resume can both exist). */
  findByConversationId(agentId: string, conversationId: string): ConversationEntry[] {
    const matches: ConversationEntry[] = [];
    for (const entry of this.#byKey.values()) {
      if (entry.agentId === agentId && entry.conversationId === conversationId) {
        matches.push(entry);
      }
    }

    return matches;
  }

  /** Sessions that already have a public conversation id (eligible for reconnect recovery). */
  listClaimed(): Array<ConversationEntry & { conversationId: string }> {
    const claimed: Array<ConversationEntry & { conversationId: string }> = [];
    for (const entry of this.#byKey.values()) {
      if (entry.conversationId) {
        claimed.push(entry as ConversationEntry & { conversationId: string });
      }
    }

    return claimed;
  }

  /**
   * Return the entry for `key`, or create an empty session.
   * This method does not reuse a session that only shares `conversationId`.
   * Resume (`key === conversationId`) stays separate from an in-flight `local_*` create.
   */
  getOrCreate(args: { agentId: string; key: string; conversationId?: string }): ConversationEntry {
    const existing = this.#byKey.get(args.key);
    if (existing) {
      return existing;
    }

    const entry: ConversationEntry = {
      ...createInitialAgentConversationState(),
      agentId: args.agentId,
      conversationId: args.conversationId,
      key: args.key,
      olderCursor: null,
      reportedActionIds: new Set(),
      mcpConnectionResults: new Map(),
      messageMutations: new Map(),
      isRecovering: false,
      paginationStatus: 'idle',
      paginationEpoch: 0,
    };
    this.#byKey.set(args.key, entry);

    return entry;
  }

  /**
   * Append a user message with status `sending`. Returns the optimistic message id.
   * The optimistic message is not reported as added: `markSent` reports it once under
   * the server id, and `markFailed` never reports it.
   */
  appendSending(entry: ConversationEntry, text: string, idempotencyKey: string): string {
    const messageId = createOptimisticMessageId();
    this.setRecoveryState(entry, { isRecovering: entry.isRecovering, catchUpError: undefined });
    applyState(entry, {
      ...appendUserMessage(entry, {
        id: messageId,
        createdAt: new Date().toISOString(),
        status: 'sending',
        idempotencyKey,
        parts: [{ type: 'text', text, state: 'done' }],
      }),
      error: undefined,
    });
    this.#publish(entry, { kind: 'local' }, []);

    return messageId;
  }

  findMessage(entry: ConversationEntry, messageId: string): AgentMessage | undefined {
    return entry.messages.find((message) => message.id === messageId);
  }

  markRetrying(entry: ConversationEntry, messageId: string): boolean {
    const target = entry.messages.find((message) => message.id === messageId);
    if (!target || target.status !== 'failed' || !target.idempotencyKey) {
      return false;
    }

    entry.messages = entry.messages.map((message) =>
      message.id === messageId ? { ...message, status: 'sending' as const } : message
    );
    this.#publish(entry, { kind: 'local' }, []);

    return true;
  }

  /**
   * Mark an optimistic message as `sent` and set the server message id.
   * Also records the public conversation id. Does not change `entry.key`.
   */
  markSent(
    entry: ConversationEntry,
    args: { optimisticMessageId: string; serverMessageId: string; conversationId: string; idempotencyKey?: string }
  ): ConversationEntry {
    const previous = entry.messages;
    entry.messages = entry.messages.map((message) =>
      message.id === args.optimisticMessageId
        ? {
            ...message,
            id: args.serverMessageId,
            status: 'sent' as const,
            idempotencyKey: args.idempotencyKey ?? message.idempotencyKey,
          }
        : message
    );

    if (!entry.conversationId) {
      entry.conversationId = args.conversationId;
    }

    this.#publish(entry, { kind: 'local' }, messagesAddedSince(previous, entry.messages));

    return entry;
  }

  markFailed(entry: ConversationEntry, messageId: string): ConversationEntry {
    entry.messages = entry.messages.map((message) =>
      message.id === messageId ? { ...message, status: 'failed' as const } : message
    );
    this.#publish(entry, { kind: 'local' }, []);

    return entry;
  }

  /**
   * Merge a history page into this session.
   * Server message ids win. Local-only messages stay on the session.
   */
  absorbHistoryPage(
    entry: ConversationEntry,
    envelopes: AgentEventEnvelope[],
    olderCursor: string | null
  ): ConversationEntry {
    const previous = entry.messages;
    this.#recordMcpConnectionResults(entry, envelopes);
    this.#recordMessageMutations(entry, envelopes);
    const folded = applyEnvelopes(createInitialAgentConversationState(), envelopes);
    const serverIds = new Set(folded.messages.map((message) => message.id));
    const localOnly = previous.filter((message) => !serverIds.has(message.id));

    applyState(entry, {
      ...folded,
      messages: this.#overlayMessages(entry, [...folded.messages, ...localOnly]),
    });
    entry.olderCursor = olderCursor;
    entry.paginationEpoch += 1;
    entry.paginationStatus = 'idle';
    entry.pendingFetchMore = undefined;

    this.#publish(entry, { kind: 'history' }, messagesAddedSince(previous, entry.messages));

    return entry;
  }

  /**
   * Run one history page fetch for this session.
   * Overlapping calls reuse the same in-flight promise.
   */
  withFetchMoreClaim(
    entry: ConversationEntry,
    fetch: () => Promise<{ data?: FetchMoreResult; error?: NovuError }>
  ): Promise<{ data?: FetchMoreResult; error?: NovuError }> {
    if (entry.pendingFetchMore) {
      return entry.pendingFetchMore;
    }

    entry.paginationStatus = 'loading';
    this.#publish(entry, { kind: 'local' }, []);

    const epoch = entry.paginationEpoch;
    const current = fetch().then((result) => {
      if (epoch !== entry.paginationEpoch) {
        return {
          data: {
            messages: entry.messages,
            hasMore: entry.olderCursor != null,
          },
        };
      }

      entry.paginationStatus = result.error ? 'error' : 'idle';
      this.#publish(entry, { kind: 'local' }, []);

      return result;
    });

    const claim = current.finally(() => {
      if (entry.pendingFetchMore === claim) {
        entry.pendingFetchMore = undefined;
      }
    });
    entry.pendingFetchMore = claim;

    return current;
  }

  /**
   * Apply an older history page without resetting live timeline fields.
   * Preserves `lastSequence` so the live sequence gate stays valid after pagination.
   */
  prependOlderPage(
    entry: ConversationEntry,
    envelopes: AgentEventEnvelope[],
    olderCursor: string | null
  ): ConversationEntry {
    this.#recordMcpConnectionResults(entry, envelopes);
    this.#recordMessageMutations(entry, envelopes);
    const folded = applyEnvelopes(createInitialAgentConversationState(), envelopes);
    const existingIds = new Set(entry.messages.map((message) => message.id));
    const olderMessages = this.#overlayMessages(
      entry,
      folded.messages.filter((message) => !existingIds.has(message.id))
    );

    entry.messages = [...olderMessages, ...entry.messages];
    entry.olderCursor = olderCursor;
    this.#suppressActions(entry, olderMessages);

    this.#publish(entry, { kind: 'history' }, olderMessages);

    return entry;
  }

  /** Update reconnect recovery flags and notify listeners. */
  setRecoveryState(
    entry: ConversationEntry,
    state: { isRecovering: boolean; catchUpError?: NovuError | undefined }
  ): ConversationEntry {
    entry.isRecovering = state.isRecovering;
    if ('catchUpError' in state) {
      entry.catchUpError = state.catchUpError;
    }
    this.#publish(entry, { kind: 'local' }, []);

    return entry;
  }

  /**
   * Apply one live envelope and notify listeners.
   * Drops envelopes at or behind `lastSequence` so recovery HTTP and buffered socket overlap is safe.
   */
  applyLiveEnvelope(entry: ConversationEntry, envelope: AgentEventEnvelope): ConversationEntry {
    if (envelope.sequence <= entry.lastSequence) {
      return entry;
    }

    const previous = entry.messages;
    this.#recordMcpConnectionResults(entry, [envelope]);
    this.#recordMessageMutations(entry, [envelope]);
    const next = applyEnvelope(entry, envelope);
    applyState(entry, {
      ...next,
      messages: this.#applyMcpConnectionResults(entry, next.messages),
    });
    this.#publish(entry, { kind: 'live', envelope }, messagesAddedSince(previous, entry.messages));

    return entry;
  }

  /**
   * Run an HTTP post for this session.
   * If there is no conversation id, only one create runs at a time.
   * If a create succeeds, later waiters reuse that id.
   */
  withCreateClaim<T>(
    entry: ConversationEntry,
    explicitConversationId: string | undefined,
    post: (conversationId?: string) => Promise<T>
  ): Promise<T> {
    const known = explicitConversationId ?? entry.conversationId;
    if (known) {
      return post(known);
    }

    const run = async (): Promise<T> => {
      if (entry.conversationId) {
        return post(entry.conversationId);
      }

      return post(undefined);
    };

    const previous = entry.pendingCreate ?? Promise.resolve();
    const current = previous.then(run, run);
    entry.pendingCreate = current.then(
      () => undefined,
      () => undefined
    );

    return current;
  }
}
