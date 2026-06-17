import type { Adapter, CardElement, Emoji, Thread } from 'chat';

// ---------------------------------------------------------------------------
// Adapter configuration
// ---------------------------------------------------------------------------

export interface NovuAdapterConfig {
  /**
   * Novu secret API key. Sent as `Authorization: ApiKey <apiKey>` on every reply
   * POST to `apiBaseUrl/v1/agents/:id/reply`. Required.
   */
  apiKey: string;
  /** Agent identifier the bridge requests target and replies are posted to. Required. */
  agentIdentifier: string;
  /**
   * Shared secret used to verify the HMAC signature (`novu-signature` header) on
   * every inbound bridge request. This is the Novu environment secret key that
   * Novu signs `AgentBridgeRequest` payloads with. Required.
   */
  bridgeSecret: string;
  /**
   * Base URL of the Novu API. The reply URL is *derived* from this
   * (`<apiBaseUrl>/v1/agents/<agentIdentifier>/reply`) — the inbound request's
   * `replyUrl` is deliberately ignored so the apiKey can never be exfiltrated to
   * an attacker-controlled URL even if HMAC verification is misconfigured.
   *
   * @default 'https://api.novu.co'
   */
  apiBaseUrl?: string;
  /**
   * When set, the adapter registers this URL as the agent's bridge endpoint at
   * boot via `PUT <apiBaseUrl>/v1/agents/:id/bridge`. Omit to skip registration
   * (e.g. when the bridge URL is configured in the Novu dashboard).
   */
  bridgeUrl?: string;
  /**
   * Maximum age (ms) of a signed bridge request before it is rejected as stale.
   * @default 300000 (5 minutes)
   */
  maxSignatureAgeMs?: number;
  /** Injected fetch implementation (defaults to global `fetch`). Primarily for tests. */
  fetch?: typeof fetch;
}

// ---------------------------------------------------------------------------
// Bridge wire contract (mirrors @novu/framework AgentBridgeRequest)
// ---------------------------------------------------------------------------

export enum AgentEvent {
  ON_MESSAGE = 'onMessage',
  ON_ACTION = 'onAction',
  ON_RESOLVE = 'onResolve',
  ON_REACTION = 'onReaction',
}

export interface AgentMessageAuthor {
  userId: string;
  fullName: string;
  userName: string;
  isBot: boolean | 'unknown';
}

export interface AgentAttachment {
  type: string;
  url?: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface AgentMessage {
  text: string;
  platformMessageId: string;
  author: AgentMessageAuthor;
  timestamp: string;
  attachments?: AgentAttachment[];
}

export interface AgentConversation {
  identifier: string;
  status: string;
  metadata: Record<string, unknown>;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface AgentSubscriber {
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: Record<string, unknown>;
}

export interface AgentHistoryEntry {
  role: string;
  type: string;
  content: string;
  richContent?: Record<string, unknown>;
  senderName?: string;
  signalData?: { type: string; payload?: Record<string, unknown> };
  createdAt: string;
}

export interface AgentAction {
  id: string;
  value?: string;
  sourceMessageId?: string;
}

export interface AgentReaction {
  messageId: string;
  emoji: { name: string };
  added: boolean;
  message: AgentMessage | null;
}

export interface AgentPlatformContext {
  threadId: string;
  channelId: string;
  isDM: boolean;
  message?: unknown;
  email?: Record<string, unknown>;
}

export interface AgentBridgeRequest {
  version: number;
  timestamp: string;
  deliveryId: string;
  event: string;
  agentId: string;
  replyUrl: string;
  conversationId: string;
  integrationIdentifier: string;
  action: AgentAction | null;
  message: AgentMessage | null;
  reaction: AgentReaction | null;
  conversation: AgentConversation;
  subscriber: AgentSubscriber | null;
  history: AgentHistoryEntry[];
  platform: string;
  platformContext: AgentPlatformContext;
}

// ---------------------------------------------------------------------------
// Reply wire contract (mirrors @novu/framework AgentReplyPayload)
// ---------------------------------------------------------------------------

export interface ReplyFileRef {
  filename: string;
  mimeType?: string;
  data?: string;
  url?: string;
}

export interface ReplyContent {
  markdown?: string;
  card?: CardElement;
  files?: ReplyFileRef[];
}

export interface EditPayload {
  messageId: string;
  content: ReplyContent;
}

export interface AddReactionPayload {
  messageId: string;
  emojiName: Emoji | string;
}

export type MetadataSignal =
  | { type: 'metadata'; action: 'set'; key: string; value: unknown }
  | { type: 'metadata'; action: 'delete'; key: string }
  | { type: 'metadata'; action: 'clear' };

export type TriggerSignal = {
  type: 'trigger';
  workflowId: string;
  to?: unknown;
  payload?: Record<string, unknown>;
};

export type Signal = MetadataSignal | TriggerSignal;

export interface AgentReplyPayload {
  conversationId: string;
  integrationIdentifier: string;
  reply?: ReplyContent;
  edit?: EditPayload;
  resolve?: { summary?: string };
  signals?: Signal[];
  addReactions?: AddReactionPayload[];
}

/** Shape returned by `/agents/:id/reply` when a reply or edit was delivered. */
export interface SentMessageInfo {
  messageId: string;
  platformThreadId: string;
}

// ---------------------------------------------------------------------------
// Adapter-internal types
// ---------------------------------------------------------------------------

/** Decoded thread identity. Packed into / out of the opaque thread id string. */
export interface NovuThreadId {
  platform: string;
  integrationIdentifier: string;
  conversationId: string;
  isDM: boolean;
}

/** Platform-native raw message carried on `RawMessage.raw` / `platformContext.message`. */
export interface NovuRawMessage {
  id: string;
  text: string;
  author: AgentMessageAuthor;
  timestamp: string;
  attachments?: AgentAttachment[];
  conversationId: string;
  integrationIdentifier: string;
  platform: string;
}

/** Cached snapshot of the latest bridge request for a thread (for fetchThread/fetchMessages). */
export interface ThreadSnapshot {
  history: AgentHistoryEntry[];
  conversation: AgentConversation;
  subscriber: AgentSubscriber | null;
  platform: string;
  platformContext: AgentPlatformContext;
}

/** Opt-in, Novu-only context surfaced via `getNovuContext(thread)`. */
export interface NovuContext {
  /** Novu platform this thread arrived on (e.g. `'slack'`, `'whatsapp'`). */
  readonly platform: string;
  /** Trigger a Novu workflow for this conversation's subscriber (or explicit recipients). */
  trigger(workflowId: string, opts?: { to?: unknown; payload?: Record<string, unknown> }): Promise<void>;
  /** Persist a key/value into `conversation.metadata`. */
  setMetadata(key: string, value: unknown): Promise<void>;
  /** Delete a key from `conversation.metadata`. */
  deleteMetadata(key: string): Promise<void>;
  /** Mark the conversation resolved, with an optional summary. */
  resolve(summary?: string): Promise<void>;
}

/**
 * Consumer-facing adapter type — widened to the base `Adapter` so instances are
 * assignable to `new Chat({ adapters: { novu } })` without generic variance errors.
 */
export type NovuAdapter = Adapter;

/** Adapter with Novu-specific thread/message generics (implementation / advanced use). */
export type NovuTypedAdapter = Adapter<NovuThreadId, NovuRawMessage>;

/** Subset of the adapter surface `getNovuContext` needs — avoids a circular import. */
export interface NovuContextSource {
  emitSignals(threadId: string, signals: Signal[]): Promise<void>;
  emitResolve(threadId: string, summary?: string): Promise<void>;
  decodeThreadId(threadId: string): NovuThreadId;
}

export type AdapterThread = Thread;
