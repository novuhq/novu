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

export interface AgentPlatformContext {
  threadId: string;
  channelId: string;
  isDM: boolean;
}

// ---------------------------------------------------------------------------
// Rich content types
// ---------------------------------------------------------------------------

export interface FileRef {
  filename: string;
  mimeType?: string;
  /** Base64-encoded file data (< 1 MB decoded) */
  data?: string;
  /** Publicly-accessible HTTPS URL */
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

export interface AgentAction {
  actionId: string;
  value?: string;
}

// ---------------------------------------------------------------------------
// Context + handlers
// ---------------------------------------------------------------------------

export interface AgentReaction {
  messageId: string;
  emoji: { name: string };
  added: boolean;
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

export interface AgentContext {
  readonly event: string;
  readonly action: AgentAction | null;
  readonly message: AgentMessage | null;
  readonly reaction: AgentReaction | null;
  readonly conversation: AgentConversation;
  readonly subscriber: AgentSubscriber | null;
  readonly history: AgentHistoryEntry[];
  readonly platform: string;
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
  resolve(summary?: string): void;
  metadata: {
    set(key: string, value: unknown): void;
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

export interface AgentHandlers {
  onMessage:   (ctx: AgentContext) => Awaitable<MessageContent | void>;
  onReaction?: (ctx: AgentContext) => Awaitable<MessageContent | void>;
  onAction?:   (ctx: AgentContext) => Awaitable<MessageContent | void>;
  onResolve?:  (ctx: AgentContext) => Awaitable<MessageContent | void>;
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

export type MetadataSignal = { type: 'metadata'; key: string; value: unknown };

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
