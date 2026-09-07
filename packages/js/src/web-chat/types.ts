import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentMcpConnectionPart,
  AgentMessage,
  AgentPendingAction,
  AgentToolApprovalDecision,
} from './agent-message.types';

export type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentEventEnvelope,
  AgentMcpConnectionPart,
  AgentMessage,
  AgentPendingAction,
  AgentToolApprovalDecision,
};

/**
 * HMAC-SHA256 of `agentId` with the environment secret.
 * Required when Security HMAC is on for the Web Chat integration.
 */
export type AgentHashFields = {
  agentHash?: string;
};

export type SendMessageArgs = AgentHashFields & {
  agentId: string;
  text: string;
  metadata?: Record<string, unknown>;
  /**
   * Existing conversation to append to.
   * Omit this field to create a new conversation.
   * After create, pass the returned `conversationId` on later sends.
   */
  conversationId?: string;
  /** @internal Session key for the local cache. */
  key?: string;
};

/** Result of a successful send or retry. */
export type SendMessageResult = {
  conversationId: string;
  messageId: string;
};

export type RetryMessageArgs = AgentHashFields & {
  agentId: string;
  messageId: string;
  conversationId?: string;
  /** @internal Session key for the local cache. */
  key?: string;
};

export type RetryMessageResult = SendMessageResult;

export type LoadConversationArgs = {
  agentId: string;
  conversationId: string;
};

/** Newest history page for a resumed conversation. */
export type LoadConversationResult = {
  conversationId: string;
  messages: AgentMessage[];
  hasMore: boolean;
};

export type FetchMoreArgs = {
  agentId: string;
  conversationId?: string;
  /** @internal Session key for the local cache. */
  key?: string;
};

/** Next older history page. */
export type FetchMoreResult = {
  messages: AgentMessage[];
  hasMore: boolean;
};

export type {
  WebChatChange,
  WebChatChangeSource,
  WebChatMessagesUpdated,
  WebChatPagination,
  WebChatPaginationStatus,
} from '../event-emitter/web-chat-events';

export type RespondToActionArgs = AgentHashFields & {
  agentId: string;
  approvalId: string;
  decision: AgentToolApprovalDecision;
  conversationId?: string;
  /** @internal Session key for the local cache. */
  key?: string;
};

/** Result of a tool-approval decision. */
export type RespondToActionResult = {
  conversationId: string;
};

export type SendActionArgs = AgentHashFields & {
  agentId: string;
  /** `id` of the clicked Card button. */
  actionId: string;
  /** `id` of the message that carries the Card. */
  sourceMessageId: string;
  /** `value` of the clicked Card button, if set. */
  value?: string;
  conversationId?: string;
  /** @internal Session key for the local cache. */
  key?: string;
};

/** Result of a Card button click. */
export type SendActionResult = {
  conversationId: string;
};

/** One conversation in a `listConversations` page. */
export type WebChatConversation = {
  identifier: string;
  title: string;
  status: AgentConversationStatus;
  agentIdentifier: string;
  lastActivityAt: string;
  createdAt: string;
};

export type ListConversationsArgs = {
  limit?: number;
  after?: string;
  before?: string;
  orderBy?: 'lastActivityAt' | 'createdAt';
  orderDirection?: 'ASC' | 'DESC';
};

/** One page of the current subscriber's conversations. */
export type ListConversationsResult = {
  conversations: WebChatConversation[];
  next: string | null;
  previous: string | null;
};
