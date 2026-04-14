export enum AgentEventEnum {
  ON_MESSAGE = 'onMessage',
  ON_RESOLVE = 'onResolve',
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

export interface AgentContext {
  readonly event: string;
  readonly message: AgentMessage | null;
  readonly conversation: AgentConversation;
  readonly subscriber: AgentSubscriber | null;
  readonly history: AgentHistoryEntry[];
  readonly platform: string;
  readonly platformContext: AgentPlatformContext;

  reply(text: string): Promise<void>;
  update(text: string): Promise<void>;
  resolve(summary?: string): void;
  metadata: {
    set(key: string, value: unknown): void;
  };
  trigger(workflowId: string, opts?: { to?: string; payload?: Record<string, unknown> }): void;
}

export interface AgentHandlers {
  onMessage: (ctx: AgentContext) => Promise<void>;
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
  message: AgentMessage | null;
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
  reply?: { text: string };
  update?: { text: string };
  resolve?: { summary?: string };
  signals?: Signal[];
}
