import type { CardElement, ChatElement, Emoji } from 'chat';
import type { TriggerRecipientsPayload } from '../../shared';
import type { Awaitable } from '../../types/util.types';
import type { ToolApprovalRequestPayload } from './tool-approval/action-id';
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

/**
 * A single connect-time context value: either a bare string id, or a rich object with an `id`
 * and arbitrary `data`. Mirrors Novu's `ContextValue`.
 */
export type AgentContextValue = string | { id: string; data?: Record<string, unknown> };

/**
 * Connect-time context bound to the channel connection and resolved server-side for the current
 * turn.
 *
 * Populated by Novu from the context an integrator passes to the Connect button (e.g. the Slack
 * connect flow persists it on the `ChannelConnection`). It lets a single hosted agent serve many
 * tenants: the agent reads its own tenant/org out of the context to scope writes. Keys are
 * integrator-defined context types (e.g. `tenant`), mirroring Novu's `ContextPayload`.
 */
export type AgentContextPayload = Record<string, AgentContextValue>;

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
  /**
   * Whether the author is an authenticated, linked subscriber (`true`) as opposed
   * to an auto-provisioned "phantom" created from an unlinked inbound sender
   * (`false`). This is the primary gating input for `restricted` agents: the
   * framework short-circuits and renders an auth CTA card when this is `false`.
   * Computed by Novu at inbound time; the agent never has to derive it.
   */
  isLinked?: boolean;
}

/**
 * Tool-call details on a tool-related history entry. Which fields are set depends on the
 * entry's `type` (`tool_approval_request`, `tool_approval_decision`, or `tool_result`).
 */
export interface AgentToolData {
  /** Id of the tool call. */
  toolCallId?: string;
  /** Name of the tool. */
  toolName?: string;
  /** Id linking an approval request to its decision. */
  approvalId?: string;
  /** Arguments the tool was called with. */
  input?: Record<string, unknown>;
  /** Whether the tool call was approved or denied. */
  approved?: boolean;
  /** What the tool returned (or the `execution-denied` marker for a denied call). */
  output?: unknown;
}

/**
 * A single entry in the conversation history.
 * `ctx.history` is an ordered array of these entries — map them to your LLM's
 * message format before making a model call.
 */
export interface AgentHistoryEntry {
  /** Message role: `'user'`, `'assistant'`, or `'system'`. */
  role: string;
  /**
   * The kind of entry: `'message'`, `'edit'`, `'signal'`, or a tool-lifecycle event
   * (`'tool_approval_request'`, `'tool_approval_decision'`, `'tool_result'`).
   */
  type: string;
  /** Plain-text representation of the message content. */
  content: string;
  richContent?: Record<string, unknown>;
  senderName?: string;
  /** Structured data for `signal` entries (e.g. metadata updates). */
  signalData?: { type: string; payload?: Record<string, unknown> };
  /** Tool-call details — set on tool-lifecycle entries (`tool_*`). */
  toolData?: AgentToolData;
  createdAt: string;
}

/** Resolved inbound email domain metadata (present when `platform === 'email'`). */
export interface AgentEmailDomainContext {
  id: string;
  name: string;
  data?: Record<string, string>;
}

/** Resolved inbound email route metadata (present when `platform === 'email'`). */
export interface AgentEmailRouteContext {
  address: string;
  data?: Record<string, string>;
}

/** Resolved inbound email envelope (present when `platform === 'email'`). */
export interface AgentEmailContext {
  domain?: AgentEmailDomainContext;
  route?: AgentEmailRouteContext;
  /**
   * Platform-native Message-ID of the message that started this email thread.
   * Equals the current message ID on the first message of a thread.
   */
  rootMessageId?: string;
}

/** Platform-specific identifiers for the thread and channel. */
export interface AgentPlatformContext {
  /** Platform-native thread ID (e.g. Slack thread `ts`, Teams conversation ID). */
  threadId: string;
  /** Platform-native channel or chat ID. */
  channelId: string;
  /** Whether the message arrived in a direct message rather than a shared channel. */
  isDM: boolean;
  /** Platform-native raw message payload from the chat SDK adapter (e.g. email `NovuEmailRawMessage`). */
  message?: unknown;
  /** Resolved inbound email routing metadata extracted from the raw payload. */
  email?: AgentEmailContext;
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
 * Cards and files can be combined on platforms that support it (e.g. WhatsApp sends media then the card).
 */
export type MessageContent = string | ChatElement;

/** Normalized content shape sent over HTTP to the reply endpoint. */
export interface ReplyContent {
  markdown?: string;
  card?: CardElement;
  toolApprovalCard?: ToolApprovalCard;
  files?: FileRef[];
}

/**
 * Data carried by a button click or other interactive action.
 *
 * Used both on the bridge wire (`AgentBridgeRequest.action`) and as the
 * handler-facing argument passed to `onAction(action, ctx)`.
 */
export interface AgentAction {
  /** The `id` prop of the clicked `<Button>` or action element. */
  id: string;
  /** The `value` prop of the clicked element, if set. */
  value?: string;
  /** Platform-native message ID of the message containing the clicked button/action. */
  sourceMessageId?: string;
}

/**
 * A tool call that requires user approval before it runs.
 * Pass this to `ctx.toolApproval.request()` when your agent wants to gate a tool.
 */
export interface AgentToolCall {
  id: string;
  name: string;
  input?: Record<string, unknown>;
}

/**
 * Presentation descriptor for Novu's built-in tool-approval card. Returned by the
 * injected `approvalCard()` helper. Novu renders it natively on Slack and as a
 * portable fallback elsewhere; Approve/Deny action ids are always supplied by Novu.
 *
 * Channel mapping (self-hosted):
 * - **Slack (native card):** `icon`, `title`, `subtitle`, `body`, `approveLabel`, `denyLabel`
 * - **Other channels (portable card):** `title`, `subtitle`, `approveLabel`, `denyLabel`
 *
 * `icon` and `body` are ignored on non-Slack channels — the portable fallback has no
 * card image or body block. Catalog icons are 32×32; custom `https://` URLs should match.
 */
export interface ToolApprovalCard {
  type: 'tool-approval-card';
  /** Slack only. Catalog id (`'stripe'`), `https://` URL, or omit to auto-match the tool name. Use 32×32 px for custom URLs. */
  icon?: string;
  /** All channels. Card title. Defaults to `Tool approval required`. */
  title?: string;
  /** All channels. Card subtitle; auto-generated from the tool name/input when omitted. */
  subtitle?: string;
  /** Slack only. Optional markdown body (e.g. argument preview). Not shown on portable fallback. */
  body?: string;
  /** All channels. Approve button label. Defaults to `Approve`. */
  approveLabel?: string;
  /** All channels. Deny button label. Defaults to `Deny`. */
  denyLabel?: string;
}

/**
 * Returned by `ctx.toolApproval.request()`. Return it from `onMessage` to post
 * an approval card and end the turn until the user approves or denies.
 */
export class PendingApproval {
  readonly __novuPendingApproval = true as const;
}

/** Optional customization for tool approval messages. */
export interface ToolApprovalConfig {
  /**
   * Build the approval message shown while waiting for a decision.
   *
   * Return `approvalCard(...)` for Novu's channel-adaptive card (native on Slack,
   * fallback elsewhere), or return a string/`Card` to take full control (portable
   * on every channel). Use the provided `actionIds` on your own buttons.
   */
  renderApproval?: (args: {
    toolCall: AgentToolCall;
    actionIds: { approve: string; deny: string };
    approvalCard: (overrides?: Omit<ToolApprovalCard, 'type'>) => ToolApprovalCard;
  }) => MessageContent | ToolApprovalCard;
}

/**
 * How Novu treats unknown/unlinked senders of a distributed agent, mirrored onto
 * the bridge wire so the framework can gate before running a handler:
 * - `open`: anyone may talk to the agent (unknown senders are auto-provisioned).
 * - `restricted`: only authenticated, linked subscribers proceed; unlinked authors
 *   are shown an auth CTA and short-circuited.
 */
export type AgentSubscriberAccess = 'open' | 'restricted';

export interface AuthConfigObject {
  /**
   * Where the unlinked user links their account. Rendered as a link button; omit
   * to show a message-only prompt (no button). Distributors build this from their
   * own app (e.g. the Novu Copilot points it at the dashboard connect page).
   */
  linkUrl?: string;
  /** Card heading. */
  title?: string;
  /** Body copy explaining why linking is required. */
  message?: string;
  /** Link-button label. */
  buttonLabel?: string;
  /** Heading on the post-link confirmation card shown once the author is linked. */
  linkedTitle?: string;
  /** Body copy shown on the confirmation card after the author links their account. */
  linkedMessage?: string;
}

export type AuthConfigCallback = (ctx: AgentHandlerContext) => Promise<AuthConfigObject | CardElement>;

/**
 * Optional customization of the auth CTA the framework posts when an unlinked
 * author messages a `restricted` agent. Set it on the agent like `toolApproval`;
 * omit it to render a generic, message-only prompt.
 */
export type AuthConfig = AuthConfigObject | AuthConfigCallback;

/** Passed to `onToolApproval` when the user clicks Approve or Deny. */
export interface ToolApprovalDecision {
  /** The tool that was awaiting approval. */
  toolCall: AgentToolCall;
  /** `true` if the user approved, `false` if they denied. */
  approved: boolean;
  /**
   * Handle to the approval message. When you register `onToolApproval`, you own
   * card cleanup — call `edit()` or `delete()` as needed. When the framework
   * handles the approval click, the card is deleted for you.
   */
  approvalMessage: ReplyHandle;
}

/** Controls on `ctx.toolApproval` for gating tool calls. */
export interface ToolApprovalControl {
  /**
   * Post an approval message and pause the turn.
   * Return the result (`return ctx.toolApproval.request(...)`) from `onMessage`
   * to end the turn until the user decides.
   */
  request(toolCall: AgentToolCall): Promise<PendingApproval>;
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
  /** Delete this message from the platform. Removes the rendered message only — history is preserved. */
  delete(): Promise<void>;
}

export interface AgentHandlerContext {
  /** Live state of the current conversation, including persisted metadata. */
  readonly conversation: AgentConversation;
  /**
   * The Novu subscriber who sent the message, or `null` if Novu could not
   * resolve a subscriber for this conversation.
   */
  readonly subscriber: AgentSubscriber | null;
  /**
   * Connect-time context resolved for this turn from the channel connection, or `null` when none
   * was bound. Populated server-side (trusted) — safe to use for authorizing and scoping writes
   * (e.g. reading the customer's tenant/organization out of it).
   */
  readonly context: AgentContextPayload | null;
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
   * Gate tool calls that need user approval before they run.
   *
   * @example
   *   if (needsApproval(toolCall)) {
   *     return ctx.toolApproval.request(toolCall);
   *   }
   */
  readonly toolApproval: ToolApprovalControl;
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
  /**
   * Delete a platform message by id. Queued and flushed with the next `ctx.reply()`,
   * or automatically when the handler completes (same batching as `ctx.addReaction()`).
   * Deletes the rendered message only — conversation history is preserved.
   *
   * @example
   *   ctx.deleteMessage(ctx.action!.sourceMessageId!);
   *   await ctx.reply('Processing…');
   */
  deleteMessage(messageId: string): void;
  /**
   * Control the typing / "Thinking…" status for the current turn.
   * Posts immediately (like `reply()`), updating the indicator Novu already shows on inbound.
   *
   * @example
   *   await ctx.typing('Searching the docs…'); // set / replace the status text
   *   await ctx.typing();                       // reset to the default "Thinking…"
   *   await ctx.typing.stop();                  // clear it for this turn
   *
   * Behaviour is best-effort per platform: custom text shows on Slack-like platforms,
   * a generic typing bubble on others, and is a no-op where there is no typing channel
   * (e.g. email). A normal turn that ends with `ctx.reply()` clears the status automatically.
   */
  typing: TypingControl;
}

/** Context passed to the `onMessage` handler. */
export interface AgentMessageContext extends AgentHandlerContext {
  readonly event: 'onMessage';
}

/** Context passed to the `onAction` handler. */
export interface AgentActionContext extends AgentHandlerContext {
  readonly event: 'onAction';
  /** The button click or interactive action that triggered this handler. */
  readonly action: AgentAction;
}

/** Context passed to the `onReaction` handler. */
export interface AgentReactionContext extends AgentHandlerContext {
  readonly event: 'onReaction';
  /** The emoji reaction that triggered this handler. */
  readonly reaction: AgentReaction;
}

/** Context passed to the `onResolve` handler. */
export interface AgentResolveContext extends AgentHandlerContext {
  readonly event: 'onResolve';
}

export type AgentContext = AgentMessageContext | AgentActionContext | AgentReactionContext | AgentResolveContext;

/** Event handlers for a conversational agent. */
export interface AgentHandlers {
  /**
   * Fires on every text message the user sends.
   *
   * @param message - The incoming message that triggered this handler.
   * @param ctx - Conversation history, subscriber, metadata, and reply/trigger methods.
   *
   * Return a string or JSX card to reply, or call `ctx.reply()` directly
   * for more control (e.g. editing a message in place).
   */
  onMessage: (message: AgentMessage, ctx: AgentMessageContext) => Awaitable<MessageContent | void>;
  /**
   * Fires when the user adds or removes an emoji reaction to a message.
   *
   * @param reaction - The emoji reaction (carries the emoji and whether it was added or removed).
   * @param ctx - Conversation context (history, subscriber, metadata, reply/trigger methods).
   *
   * Return a string or card to post a reply, or return nothing to silently acknowledge.
   */
  onReaction?: (reaction: AgentReaction, ctx: AgentReactionContext) => Awaitable<MessageContent | void>;
  /**
   * Fires when the user clicks a `<Button>` or other interactive element.
   *
   * @param action - The interactive action that triggered this handler.
   *   `action.id` is the `id` prop of the clicked element; `action.value` is its `value` prop.
   * @param ctx - Conversation context (history, subscriber, metadata, reply/trigger methods).
   *
   * Return a string or card to reply, or return nothing to silently acknowledge the click.
   */
  onAction?: (action: AgentAction, ctx: AgentActionContext) => Awaitable<MessageContent | void>;
  /**
   * Fires after `ctx.resolve()` is called and the conversation is marked resolved.
   * Use for post-resolution side-effects (e.g. triggering a follow-up workflow).
   *
   * @param ctx - Conversation context. Access subscriber and conversation via
   *   `ctx.subscriber` and `ctx.conversation`.
   */
  onResolve?: (ctx: AgentResolveContext) => Awaitable<MessageContent | void>;
  /**
   * Fires when the user approves or denies a tool call you previously gated with
   * `ctx.toolApproval.request()`.
   *
   * @param decision - The tool, the user's verdict, and a handle to the approval message.
   * @param ctx - Conversation context (history, subscriber, metadata, reply/trigger methods).
   *
   * Run the tool (or skip it), then return a reply or call `ctx.reply()` directly.
   * Register this handler whenever you call `ctx.toolApproval.request()` in `onMessage`.
   */
  onToolApproval?: (decision: ToolApprovalDecision, ctx: AgentActionContext) => Awaitable<MessageContent | void>;
  /**
   * Customize how approval messages look. Omit to use the built-in Approve/Deny card.
   */
  toolApproval?: ToolApprovalConfig;
  /**
   * Customize the "link your account" CTA the framework shows to unlinked authors
   * of a `restricted` agent. The gate itself is applied by the framework (driven
   * by the bridge's `subscriberAccess`); this only overrides the rendered prompt.
   * Omit to use the built-in generic prompt.
   */
  auth?: AuthConfig;
}

export interface Agent {
  id: string;
  handlers: AgentHandlers;
  /**
   * @internal Set by `agent()` / ai-sdk registration. True when the application
   * author registered `onToolApproval` (full manual card cleanup). False when
   * only a framework wrapper handles approval clicks (auto-delete after handler).
   */
  userOnToolApproval?: boolean;
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
  /**
   * Effective subscriber-access policy for this agent (`open` | `restricted`),
   * resolved server-side. Drives the framework's built-in auth gate: on a
   * `restricted` agent an unlinked author is short-circuited with an auth CTA
   * before any handler runs. Optional on the wire for backward compatibility;
   * absent is treated as `open` (no gating).
   */
  subscriberAccess?: AgentSubscriberAccess;
  /**
   * Connect-time context resolved server-side for this turn (trusted). Optional on the wire so
   * older API versions that don't send it remain compatible; absent → `ctx.context` is `null`.
   */
  context?: AgentContextPayload | null;
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

/** The outcome of a tool call, reported back so it's saved in the conversation history. */
export type ToolResult = {
  /** Id of the tool call this result belongs to. */
  toolCallId: string;
  /** Name of the tool. */
  toolName?: string;
  /** What the tool returned (or the `execution-denied` marker for a denied call). */
  output: unknown;
  /** Optional human-readable summary shown in the conversation timeline. */
  preview?: string;
};

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

/** Delete a previously posted platform message. Removes the rendered message only — history is preserved. */
export interface DeleteMessagePayload {
  messageId: string;
}

/**
 * Per-turn typing/status control op sent on the reply contract.
 * - `{ status?: string }` — set/replace the status; omit `status` for the default "Thinking…".
 * - `'stop'` — clear the status for this turn.
 */
export type TypingOp = { status?: string } | 'stop';

/**
 * `ctx.typing` surface: a callable that sets/updates the status, plus `.stop()` to clear it.
 */
export type TypingControl = ((status?: string) => Promise<void>) & {
  stop: () => Promise<void>;
};

export interface AgentReplyPayload {
  conversationId: string;
  integrationIdentifier: string;
  reply?: ReplyContent;
  edit?: EditPayload;
  resolve?: { summary?: string };
  signals?: Signal[];
  toolResults?: ToolResult[];
  toolApprovalRequest?: ToolApprovalRequestPayload;
  addReactions?: AddReactionPayload[];
  deleteMessages?: DeleteMessagePayload[];
  typing?: TypingOp;
}

/** Shape returned by /agents/:id/reply when a reply or edit was delivered. */
export interface SentMessageInfo {
  messageId: string;
  platformThreadId: string;
}
