import { NovuAgentChatAdapterImpl } from './adapter.js';
import type { AgentChatAdapterConfig } from './types.js';

export type {
  AgentChatAcceptLimitBlock,
  AgentChatAcceptLimitBlockReason,
  AgentChatAdapterConfig,
  AgentChatAuthorizeResumeParams,
  AgentChatCheckAcceptLimitsParams,
  AgentChatDeleteMessageParams,
  AgentChatDeliverMessageParams,
  AgentChatDeliverMessageResult,
  AgentChatEditMessageParams,
  AgentChatRawMessage,
  AgentChatRequestBody,
  AgentChatSession,
  AgentChatStartTypingParams,
  AgentChatThreadId,
} from './types.js';
export {
  ADAPTER_NAME,
  CONVERSATION_ID_PATTERN,
  conversationIdFromThreadId,
  extractCardPlainText,
  isApprovalActionId,
  isValidConversationId,
  isValidMessageId,
  MESSAGE_ID_PATTERN,
  mintConversationId,
  mintMessageId,
  toThreadId,
} from './utils.js';

export type NovuAgentChatAdapter = NovuAgentChatAdapterImpl;

export function createAgentChatAdapter(config: AgentChatAdapterConfig): NovuAgentChatAdapter {
  return new NovuAgentChatAdapterImpl(config);
}
