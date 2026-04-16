import type { CardElement, ChatElement } from 'chat';

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

export interface AgentMessage {
  text: string;
  platformMessageId: string;
  author: AgentMessageAuthor;
  timestamp: string;
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
 * Content accepted by ctx.reply() and ctx.update().
 *
 * - `string` — plain text
 * - `{ markdown, files? }` — markdown-formatted text, optionally with file attachments
 * - `ChatElement` — interactive card built with Card(), Button(), etc.
 *   (must be a CardElement at runtime; validated by serializeContent)
 */
export type MessageContent = string | { markdown: string; files?: FileRef[] } | ChatElement;

/** Normalized content shape sent over HTTP to the reply endpoint. */
export interface ReplyContent {
  text?: string;
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

  reply(content: MessageContent): Promise<void>;
  update(content: MessageContent): Promise<void>;
  resolve(summary?: string): void;
  metadata: {
    set(key: string, value: unknown): void;
  };
  trigger(workflowId: string, opts?: { to?: string; payload?: Record<string, unknown> }): void;
}

export interface AgentHandlers {
  onMessage: (ctx: AgentContext) => Promise<void>;
  onReaction?: (ctx: AgentContext) => Promise<void>;
  onAction?: (ctx: AgentContext) => Promise<void>;
  onResolve?: (ctx: AgentContext) => Promise<void>;
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
export type TriggerSignal = { type: 'trigger'; workflowId: string; to?: string; payload?: Record<string, unknown> };
export type Signal = MetadataSignal | TriggerSignal;

export interface AgentReplyPayload {
  conversationId: string;
  integrationIdentifier: string;
  reply?: ReplyContent;
  update?: ReplyContent;
  resolve?: { summary?: string };
  signals?: Signal[];
}
