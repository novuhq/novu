import { NovuWebChatAdapterImpl } from './adapter.js';
import type { WebChatAdapterConfig } from './types.js';

export type {
  WebChatAcceptLimitBlock,
  WebChatAcceptLimitBlockReason,
  WebChatAdapterConfig,
  WebChatAuthorizeResumeParams,
  WebChatCheckAcceptLimitsParams,
  WebChatClaimInboundParams,
  WebChatDeleteMessageParams,
  WebChatDeliverMessageParams,
  WebChatDeliverMessageResult,
  WebChatEditMessageParams,
  WebChatInboundClaimResult,
  WebChatRawMessage,
  WebChatRequestBody,
  WebChatSession,
  WebChatStartTypingParams,
  WebChatThreadId,
} from './types.js';
export {
  ADAPTER_NAME,
  CONVERSATION_ID_PATTERN,
  conversationIdFromThreadId,
  extractCardPlainText,
  isApprovalActionId,
  isValidActionIdempotencyKey,
  isValidConversationId,
  isValidMessageId,
  MESSAGE_ID_PATTERN,
  mintConversationId,
  mintMessageId,
  toThreadId,
} from './utils.js';

export type NovuWebChatAdapter = NovuWebChatAdapterImpl;

export function createWebChatAdapter(config: WebChatAdapterConfig): NovuWebChatAdapter {
  return new NovuWebChatAdapterImpl(config);
}
