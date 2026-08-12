import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import {
  type AgentConversationState,
  type AgentMessage,
  createInitialAgentConversationState,
  derivePendingActions,
} from './agent-message.types';
import { appendUserMessage, applyEnvelope, applyEnvelopes } from './apply-envelope';
import type { AgentChatChange, AgentChatChangeSource } from './types';

/**
 * Stable local identity for one conversation holder.
 * The object reference does not change. Timeline fields are overwritten in place.
 * This store is an in-memory UI cache. It is not a synchronized server timeline.
 */
export type ConversationEntry = AgentConversationState & {
  agentId: string;
  /** Public conversation id after create, or when the session resumes. */
  conversationId?: string;
  /**
   * Map key for this holder. The key does not change for the life of the holder.
   * Create sessions use `local_*`. Resume sessions use the `conv_*` id.
   */
  key: string;
  /**
   * Cursor toward older history (`before` on the next page). Null when unknown,
   * exhausted, or on a create-only holder before any history load.
   */
  olderCursor: string | null;
  /**
   * Actions already reported as new. Add-only: an action id is never raised twice,
   * so a resolved action must not fall out and be reported again.
   */
  reportedActionIds: Set<string>;
  /** One create at a time on this holder until a conversation id exists. */
  pendingCreate?: Promise<void>;
};

function mintClientId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);

    return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  return `${prefix}_${Date.now().toString(36)}`;
}

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
 * In-memory store for agent-chat conversations.
 * `AgentChat` updates this store around HTTP calls. The hook listens on `onUpdate`.
 * The map key is the immutable holder `key`.
 */
export class AgentChatStore {
  #byKey = new Map<string, ConversationEntry>();
  #onUpdate: (entry: ConversationEntry, change: AgentChatChange) => void;

  constructor(onUpdate: (entry: ConversationEntry, change: AgentChatChange) => void) {
    this.#onUpdate = onUpdate;
  }

  /**
   * Notify listeners with the folded snapshot and what the fold added.
   * Only this store can tell the three sources apart, so it reports them instead of
   * leaving each consumer to guess from the snapshot alone.
   */
  #publish(entry: ConversationEntry, source: AgentChatChangeSource, addedMessages: AgentMessage[]): void {
    const newActions = derivePendingActions(entry.messages).filter((action) => !entry.reportedActionIds.has(action.id));
    for (const action of newActions) {
      entry.reportedActionIds.add(action.id);
    }

    this.#onUpdate(entry, { ...source, addedMessages, newActions });
  }

  /**
   * Mark a backfilled page's actions as already reported.
   * An older page can carry a request whose response is on a page already folded, which
   * leaves it looking pending. Paging backwards is never new activity.
   */
  #suppressActions(entry: ConversationEntry, messages: AgentMessage[]): void {
    for (const action of derivePendingActions(messages)) {
      entry.reportedActionIds.add(action.id);
    }
  }

  clear(): void {
    this.#byKey.clear();
  }

  get(key: string): ConversationEntry | undefined {
    return this.#byKey.get(key);
  }

  /** Find a holder that already claimed this conversation id. */
  getByConversationId(agentId: string, conversationId: string): ConversationEntry | undefined {
    for (const entry of this.#byKey.values()) {
      if (entry.agentId === agentId && entry.conversationId === conversationId) {
        return entry;
      }
    }

    return undefined;
  }

  /** All holders that already claimed this conversation id (create + resume can both exist). */
  findByConversationId(agentId: string, conversationId: string): ConversationEntry[] {
    const matches: ConversationEntry[] = [];
    for (const entry of this.#byKey.values()) {
      if (entry.agentId === agentId && entry.conversationId === conversationId) {
        matches.push(entry);
      }
    }

    return matches;
  }

  /** Holders that already have a public conversation id (eligible for reconnect catch-up). */
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
   * Return the entry for `key`, or create an empty holder.
   * This method does not reuse a holder that only shares `conversationId`.
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
    };
    this.#byKey.set(args.key, entry);

    return entry;
  }

  /**
   * Append a user message with status `sending`. Returns the optimistic message id.
   * The optimistic message is not reported as added: `markSent` reports it once under
   * the server id, and `markFailed` never reports it.
   */
  appendSending(entry: ConversationEntry, text: string): string {
    const messageId = createOptimisticMessageId();
    applyState(
      entry,
      appendUserMessage(entry, {
        id: messageId,
        createdAt: new Date().toISOString(),
        status: 'sending',
        parts: [{ type: 'text', text, state: 'done' }],
      })
    );
    this.#publish(entry, { kind: 'local' }, []);

    return messageId;
  }

  /**
   * Mark an optimistic message as `sent` and set the server message id.
   * Also records the public conversation id. Does not change `entry.key`.
   */
  markSent(
    entry: ConversationEntry,
    args: { optimisticMessageId: string; serverMessageId: string; conversationId: string }
  ): ConversationEntry {
    const previous = entry.messages;
    entry.messages = entry.messages.map((message) =>
      message.id === args.optimisticMessageId
        ? { ...message, id: args.serverMessageId, status: 'sent' as const }
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
   * Merge a history page into this holder.
   * Server message ids win. Local-only messages stay on the holder.
   */
  absorbHistoryPage(
    entry: ConversationEntry,
    envelopes: AgentEventEnvelope[],
    olderCursor: string | null
  ): ConversationEntry {
    const previous = entry.messages;
    const folded = applyEnvelopes(createInitialAgentConversationState(), envelopes);
    const serverIds = new Set(folded.messages.map((message) => message.id));
    const localOnly = previous.filter((message) => !serverIds.has(message.id));

    applyState(entry, {
      ...folded,
      messages: [...folded.messages, ...localOnly],
    });
    entry.olderCursor = olderCursor;

    this.#publish(entry, { kind: 'history' }, messagesAddedSince(previous, entry.messages));

    return entry;
  }

  /**
   * Fold an older history page into this holder without resetting live timeline fields.
   * Preserves `lastSequence` so the live sequence gate stays valid after pagination.
   */
  prependOlderPage(
    entry: ConversationEntry,
    envelopes: AgentEventEnvelope[],
    olderCursor: string | null
  ): ConversationEntry {
    const folded = applyEnvelopes(createInitialAgentConversationState(), envelopes);
    const existingIds = new Set(entry.messages.map((message) => message.id));
    const olderMessages = folded.messages.filter((message) => !existingIds.has(message.id));

    entry.messages = [...olderMessages, ...entry.messages];
    entry.olderCursor = olderCursor;
    this.#suppressActions(entry, olderMessages);

    this.#publish(entry, { kind: 'history' }, olderMessages);

    return entry;
  }

  /**
   * Apply one live envelope onto this holder and notify listeners.
   * Drops envelopes at or behind `lastSequence` so catch-up HTTP + buffered WS overlap is safe.
   */
  applyLiveEnvelope(entry: ConversationEntry, envelope: AgentEventEnvelope): ConversationEntry {
    if (envelope.sequence <= entry.lastSequence) {
      return entry;
    }

    const previous = entry.messages;
    applyState(entry, applyEnvelope(entry, envelope));
    this.#publish(entry, { kind: 'live', envelope }, messagesAddedSince(previous, entry.messages));

    return entry;
  }

  /**
   * Run an HTTP post for this entry.
   * If the holder has no conversation id, only one create runs at a time.
   * Waiters read `entry.conversationId` again after the prior create finishes.
   * If a create succeeds, later waiters reuse that id.
   * If a create fails, the next attempt still waits in line.
   * If the conversation id is already known, the post runs with no gate.
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
