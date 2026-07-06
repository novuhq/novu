import type { CardElement } from './card-elements';

export type ConversationMessagePart =
  | { type: 'text'; markdown: string }
  | { type: 'card'; card: CardElement }
  | {
      type: 'toolApproval';
      approvalId: string;
      toolCallId?: string;
      toolName?: string;
      input?: Record<string, unknown>;
      status: 'pending' | 'approved' | 'denied';
    }
  | { type: 'file'; filename?: string; mimeType?: string; size?: number; url: string };

export type ConversationMessageStatus = 'sending' | 'sent' | 'complete' | 'failed';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent';
  parts: ConversationMessagePart[];
  senderName?: string;
  createdAt: string;
  isEdited?: boolean;
  status: ConversationMessageStatus;
}

export interface Conversation {
  id: string;
  title: string;
  status: string;
  lastMessagePreview?: string;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface ConversationTargetArgs {
  /** Agent identifier (as shown in the Novu dashboard). */
  agent: string;
  /** Only needed when the agent has multiple web integrations. */
  integrationIdentifier?: string;
}

export interface ListConversationsArgs extends ConversationTargetArgs {
  limit?: number;
  /** ISO date cursor — return conversations with older activity. */
  before?: string;
}

export interface ListConversationsResponse {
  conversations: Conversation[];
  hasMore: boolean;
}

export interface GetConversationArgs extends ConversationTargetArgs {
  conversationId: string;
}

export interface FetchConversationMessagesArgs extends ConversationTargetArgs {
  conversationId: string;
  limit?: number;
  /** ISO date cursor — return messages created earlier. */
  before?: string;
}

export interface ConversationMessagesResponse {
  messages: ConversationMessage[];
  hasMore: boolean;
}

export interface SendConversationMessageArgs extends ConversationTargetArgs {
  conversationId: string;
  text: string;
  /** Client idempotency key; also used as the optimistic message id. */
  clientMessageId?: string;
  signal?: AbortSignal;
}

export interface SendConversationActionArgs extends ConversationTargetArgs {
  conversationId: string;
  actionId: string;
  value?: string;
  /** Message id of the card the action originates from. */
  sourceMessageId?: string;
  signal?: AbortSignal;
}

export interface ConversationTypingState {
  isTyping: boolean;
  status?: string;
}

export type ConversationTurnStatus = 'streaming' | 'idle' | 'error';

/** Wire DTOs returned by the /agents/web endpoints. */
export interface WebConversationDto {
  id: string;
  title: string;
  status: string;
  lastMessagePreview?: string;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface WebConversationListResponseDto {
  data: WebConversationDto[];
  hasMore: boolean;
}

export interface WebConversationMessageDto {
  id: string;
  role: 'user' | 'agent';
  parts: ConversationMessagePart[];
  senderName?: string;
  createdAt: string;
  isEdited?: boolean;
}

export interface WebConversationMessagesResponseDto {
  data: WebConversationMessageDto[];
  hasMore: boolean;
}
