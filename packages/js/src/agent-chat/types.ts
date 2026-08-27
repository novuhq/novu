import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentMcpConnectionAction,
  AgentMcpConnectionPart,
  AgentMessage,
  AgentPendingAction,
  AgentToolApprovalAction,
  AgentToolApprovalDecision,
} from './agent-message.types';

export type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentEventEnvelope,
  AgentMcpConnectionAction,
  AgentMcpConnectionPart,
  AgentMessage,
  AgentPendingAction,
  AgentToolApprovalAction,
  AgentToolApprovalDecision,
};

/**
 * HMAC-SHA256(env secret, agentId) hex. Required when the env's `novu-agent-chat`
 * integration has Security HMAC enabled.
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
   * Omit this field to create a new conversation. The client does not reuse a prior chat.
   * After create, pass the returned `conversationId` on later sends.
   */
  conversationId?: string;
  /**
   * Immutable holder key for the local store and emit subscription.
   * Defaults to `conversationId` on resume, or a minted `local_*` key on create.
   */
  key?: string;
};

export type SendMessageResult = {
  conversationId: string;
  messageId: string;
};

export type RetryMessageArgs = AgentHashFields & {
  agentId: string;
  messageId: string;
  conversationId?: string;
  key?: string;
};

export type RetryMessageResult = SendMessageResult;

export type LoadConversationArgs = {
  agentId: string;
  conversationId: string;
};

export type LoadConversationResult = {
  conversationId: string;
  messages: AgentMessage[];
  hasMore: boolean;
};

export type FetchMoreArgs = {
  agentId: string;
  conversationId?: string;
  key?: string;
};

export type FetchMoreResult = {
  messages: AgentMessage[];
  hasMore: boolean;
};

export type {
  AgentChatChange,
  AgentChatChangeSource,
  AgentChatMessagesUpdated,
  AgentChatPagination,
  AgentChatPaginationStatus,
} from '../event-emitter/agent-chat-events';

export type RespondToActionArgs = AgentHashFields & {
  agentId: string;
  actionId: string;
  decision: AgentToolApprovalDecision;
  conversationId?: string;
  key?: string;
};

export type RespondToActionResult = {
  conversationId: string;
};

export type SendActionArgs = AgentHashFields & {
  agentId: string;
  /** `id` of the clicked Card button. */
  actionId: string;
  /** Platform message id of the message that carries the Card. */
  sourceMessageId: string;
  /** `value` of the clicked Card button, if set. */
  value?: string;
  conversationId?: string;
  key?: string;
};

export type SendActionResult = {
  conversationId: string;
};
