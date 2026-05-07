import type { CardElement, ChatElement, Emoji } from 'chat';
import type { TriggerRecipientsPayload } from '../../shared';
import type { Awaitable } from '../../types/util.types';
export type { TriggerRecipientsPayload };

export enum AgentEventEnum {
  ON_MESSAGE = 'onMessage',
  ON_ACTION = 'onAction',
  ON_RESOLVE = 'onResolve',
  ON_REACTION = 'onReaction',
}

// ---------------------------------------------------------------------------
// User-facing types (visible on ctx properties)
// ---------------------------------------------------------------------------

/** Identity of the user or bot that authored a message. */
export interface AgentMessageAuthor {
  userId: string;
  fullName: string;
  userName: string;
  isBot: boolean | 'unknown';
}

/** A file or media attachment included with a message. */
export interface AgentAttachment {
  type: string;
  url?: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

/** An incoming message from the user in the current conversation. */
export interface AgentMessage {
  /** Plain-text content of the message. */
  text: string;
  /** Platform-native message ID (e.g. Slack `ts`, Teams `activityId`). */
  platformMessageId: string;
  author: AgentMessageAuthor;
  timestamp: string;
  attachments?: AgentAttachment[];
}

/** Live state of the current conversation thread. */
export interface AgentConversation {
  /** Stable identifier for this conversation. */
  identifier: string;
  /** Lifecycle status (e.g. `'open'`, `'resolved'`). */
  status: string;
  /**
   * Key/value store for this conversation.
   * Values are written via `ctx.metadata.set()` and readable on subsequent messages.
   */
  metadata: Record<string, unknown>;
  /** Number of messages exchanged so far; starts at 1 for the first message. */
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

/** The Novu subscriber who initiated or is participating in the conversation. */
export interface AgentSubscriber {
  /** Stable Novu subscriber ID. */
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  /** Arbitrary custom data attached to the subscriber in Novu. */
  data?: Record<string, unknown>;
}

/**
 * A single entry in the conversation history.
 * `ctx.history` is an ordered array of these entries — map them to your LLM's
 * message format before making a model call.
 */
export interface AgentHistoryEntry {
  /** Message role: `'user'`, `'assistant'`, or `'system'`. */
  role: string;
  /** Content type: `'text'`, `'card'`, etc. */
  type: string;
  /** Plain-text representation of the message content. */
  content: string;
  richContent?: Record<string, unknown>;
  senderName?: string;
  /** Present on system entries that carry a Novu signal (e.g. metadata updates). */
  signalData?: { type: string; payload?: Record<string, unknown> };
  createdAt: string;
}

/** Platform-specific identifiers for the thread and channel. */
export interface AgentPlatformContext {
  /** Platform-native thread ID (e.g. Slack thread `ts`, Teams conversation ID). */
  threadId: string;
  /** Platform-native channel or chat ID. */
  channelId: string;
  /** Whether the message arrived in a direct message rather than a shared channel. */
  isDM: boolean;
}

// ---------------------------------------------------------------------------
// Rich content types
// ---------------------------------------------------------------------------

export interface FileRef {
  filename: string;
  mimeType?: string;
  /**
   * Inline file data. Binary values are encoded to base64 before being sent to Novu.
   * Node Buffers are supported because Buffer extends Uint8Array.
   *
   * Limit: <= 5 MB decoded. Use `url` for larger files.
   */
  data?: string | Uint8Array | ArrayBuffer | Blob;
  /**
   * Publicly-accessible HTTP(S) URL. Recommended for larger files.
   *
   * Server-side limits: 25 MB per file, 15 files per message, 50 MB aggregate.
   */
  url?: string;
}

/**
 * Content accepted by ctx.reply() and handle.edit().
 *
 * - `string` — plain text or markdown; converted to platform format by the chat SDK
 * - `ChatElement` — interactive card built with Card(), Button(), etc.
 *
 * For file attachments, pass a `files` array as the second argument to reply()/edit().
 */
export type MessageContent = string | ChatElement;

/** Normalized content shape sent over HTTP to the reply endpoint. */
export interface ReplyContent {
  markdown?: string;
  card?: CardElement;
  files?: FileRef[];
}

/** Data carried by a button click or other interactive action. */
export interface AgentAction {
  /** The `id` prop of the clicked `<Button>` or action element. */
  actionId: string;
  /** The `value` prop of the clicked element, if set. */
  value?: string;
  /** Platform-native message ID of the message containing the clicked button/action. */
  sourceMessageId?: string;
}

// ---------------------------------------------------------------------------
// Context + handlers
// ---------------------------------------------------------------------------

/** An emoji reaction added to or removed from a message. */
export interface AgentReaction {
  /** Platform-native ID of the message that was reacted to. */
  messageId: string;
  emoji: { name: string };
  /** `true` when the reaction was added, `false` when it was removed. */
  added: boolean;
  /** The message that was reacted to, if available. */
  message: AgentMessage | null;
}

/**
 * Handle to a message posted via ctx.reply(). Mirrors the chat SDK's `SentMessage`
 * primitive: edits apply in-place on the platform (same platform message, content changes)
 * and never post a new message.
 */
export interface ReplyHandle {
  /** Platform-native message id (e.g. Slack ts, Teams activityId). */
  readonly messageId: string;
  /** Platform-native thread id this message lives in. */
  readonly platformThreadId: string;
  /** Edit this message in place with new content. Returns the same handle for chaining. */
  edit(content: MessageContent, options?: { files?: FileRef[] }): Promise<ReplyHandle>;
}

interface AgentContextBase {
  /** Live state of the current conversation, including persisted metadata. */
  readonly conversation: AgentConversation;
  /**
   * The Novu subscriber who sent the message, or `null` if Novu could not
   * resolve a subscriber for this conversation.
   */
  readonly subscriber: AgentSubscriber | null;
  /**
   * Full conversation history as an ordered array of entries.
   * Map to your LLM's message format before making a model call:
   * `ctx.history.map(h => ({ role: h.role, content: h.content }))`
   */
  readonly history: AgentHistoryEntry[];
  /** Platform identifier (e.g. `'slack'`, `'msteams'`, `'in-app'`). */
  readonly platform: string;
  /** Platform-specific thread and channel identifiers. */
  readonly platformContext: AgentPlatformContext;

  /**
   * Post a message to the conversation and return a handle to it.
   * Use the handle to edit the message in place later — no second post.
   *
   * @example
   *   const msg = await ctx.reply('Thinking…');
   *   await msg.edit('Here is the answer');
   *
   * @example with file attachment
   *   await ctx.reply('Here is your report', {
   *     files: [{ filename: 'report.pdf', url: 'https://...' }],
   *   });
   */
  reply(content: MessageContent, options?: { files?: FileRef[] }): Promise<ReplyHandle>;
  /**
   * Mark the conversation as resolved. Optionally provide a summary for the resolution record.
   * Triggers the `onResolve` handler if one is registered.
   */
  resolve(summary?: string): void;
  /**
   * Persistent key/value store for this conversation.
   *
   * - `get(key)` — read a value from the current metadata state
   * - `set(key, value)` — write a value (flushed with the next reply or on handler completion)
   * - `delete(key)` — remove a key
   * - `clear()` — reset metadata to `{}`
   * - `current` — readonly snapshot of the current state
   */
  metadata: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
    delete(key: string): void;
    clear(): void;
    readonly current: Readonly<Record<string, unknown>>;
  };
  /**
   * Trigger a Novu workflow from within this agent handler.
   *
   * Signals are batched and flushed with the next `ctx.reply()`, or automatically when the
   * handler completes. The workflow executes asynchronously — the agent reply is not blocked.
   *
   * @param workflowId - Workflow identifier (e.g. `'escalation-email'`).
   * @param opts.to - Recipient(s). Omit to target the conversation's resolved subscriber.
   * @param opts.payload - Data forwarded to the workflow payload schema.
   *
   * @example
   *   // Target the conversation subscriber automatically
   *   ctx.trigger('follow-up-email', { payload: { reason: 'unresolved' } });
   *
   *   // Explicit recipient
   *   ctx.trigger('escalation-email', { to: 'agent-inbox', payload: { priority: 'high' } });
   *
   *   // Topic broadcast
   *   ctx.trigger('team-alert', { to: { type: 'Topic', topicKey: 'support-team' } });
   */
  trigger(workflowId: string, opts?: { to?: TriggerRecipientsPayload; payload?: Record<string, unknown> }): void;
  /**
   * Add an emoji reaction to any platform message.
   * Reactions are queued and sent with the next `ctx.reply()`, or flushed automatically
   * when the handler completes (same batching contract as `ctx.trigger()`).
   *
   * @param messageId - Platform-native message ID to react to (e.g. Slack `ts`).
   * @param emojiName - Emoji short-name (e.g. `'thumbs_up'`, `'check_mark'`).
   *
   * @example
   *   ctx.addReaction(ctx.reaction!.messageId, 'check_mark');
   *   await ctx.reply('Done!');
   */
  addReaction(messageId: string, emojiName: Emoji): void;
}

/** Context passed to the `onMessage` handler. */
export interface AgentMessageContext extends AgentContextBase {
  readonly event: 'onMessage';
}

/** Context passed to the `onAction` handler. */
export interface AgentActionContext extends AgentContextBase {
  readonly event: 'onAction';
  /** The button click or interactive action that triggered this handler. */
  readonly action: AgentAction;
}

/** Context passed to the `onReaction` handler. */
export interface AgentReactionContext extends AgentContextBase {
  readonly event: 'onReaction';
  /** The emoji reaction that triggered this handler. */
  readonly reaction: AgentReaction;
}

/** Context passed to the `onResolve` handler. */
export interface AgentResolveContext extends AgentContextBase {
  readonly event: 'onResolve';
}

export type AgentContext = AgentMessageContext | AgentActionContext | AgentReactionContext | AgentResolveContext;

/** Event handlers for a conversational agent. */
export interface AgentHandlers {
  /**
   * Fires on every text message the user sends.
   * `payload.message` is the incoming message. `payload.ctx` provides conversation history,
   * subscriber, metadata, and reply/trigger methods.
   * Return a string or JSX card to reply, or call `ctx.reply()` directly
   * for more control (e.g. editing a message in place).
   */
  onMessage: (payload: { message: AgentMessage; ctx: AgentMessageContext }) => Awaitable<MessageContent | void>;
  /**
   * Fires when the user adds or removes an emoji reaction to a message.
   * `reaction` carries the emoji and whether it was added or removed.
   * Return a string or card to post a reply, or return nothing to silently acknowledge.
   */
  onReaction?: (payload: { reaction: AgentReaction; ctx: AgentReactionContext }) => Awaitable<MessageContent | void>;
  /**
   * Fires when the user clicks a `<Button>` or other interactive element.
   * `actionId` is the `id` prop of the clicked element; `value` is its `value` prop.
   * Return a string or card to reply, or return nothing to silently acknowledge the click.
   */
  onAction?: (payload: {
    actionId: string;
    value?: string;
    ctx: AgentActionContext;
  }) => Awaitable<MessageContent | void>;
  /**
   * Fires after `ctx.resolve()` is called and the conversation is marked resolved.
   * Use for post-resolution side-effects (e.g. triggering a follow-up workflow).
   * Access subscriber and conversation via `ctx.subscriber` and `ctx.conversation`.
   */
  onResolve?: (payload: { ctx: AgentResolveContext }) => Awaitable<MessageContent | void>;
}

export interface Agent {
  id: string;
  handlers: AgentHandlers;
}

// ---------------------------------------------------------------------------
// Internal types (bridge protocol — not exposed to SDK consumers)
// ---------------------------------------------------------------------------

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

export type MetadataSignal =
  | { type: 'metadata'; action: 'set'; key: string; value: unknown }
  | { type: 'metadata'; action: 'delete'; key: string }
  | { type: 'metadata'; action: 'clear' };

/**
 * Queued by `ctx.trigger()` — instructs Novu to fire a workflow from inside an agent handler.
 *
 * - `workflowId` — the workflow identifier (same string used in `novu.events.trigger()`).
 * - `to` — recipient(s) for the workflow. Accepts a subscriberId string, a subscriber object,
 *   a topic, or arrays thereof. When omitted, Novu falls back to the conversation's resolved
 *   subscriber. If no subscriber can be resolved, the trigger is skipped and a warning is logged.
 * - `payload` — arbitrary data forwarded to the workflow's payload schema.
 */
export type TriggerSignal = {
  type: 'trigger';
  workflowId: string;
  to?: TriggerRecipientsPayload;
  payload?: Record<string, unknown>;
};

export type Signal = MetadataSignal | TriggerSignal;

/** In-place edit of a previously posted agent message. Identified by platform message id. */
export interface EditPayload {
  messageId: string;
  content: ReplyContent;
}

/** An emoji reaction to be added to a platform message. */
export interface AddReactionPayload {
  messageId: string;
  emojiName: Emoji;
}

export interface AgentReplyPayload {
  conversationId: string;
  integrationIdentifier: string;
  reply?: ReplyContent;
  edit?: EditPayload;
  resolve?: { summary?: string };
  signals?: Signal[];
  addReactions?: AddReactionPayload[];
}

/** Shape returned by /agents/:id/reply when a reply or edit was delivered. */
export interface SentMessageInfo {
  messageId: string;
  platformThreadId: string;
}
