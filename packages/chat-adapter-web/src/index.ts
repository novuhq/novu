import type { Adapter } from 'chat';
import { NovuWebChatAdapterImpl } from './adapter.js';
import type { WebChatAdapterConfig, WebChatRawMessage, WebChatThreadId } from './types.js';

export { NovuWebChatAdapterImpl } from './adapter.js';
export type {
  WebChatAdapterConfig,
  WebChatAuthorizeResumeParams,
  WebChatDeleteMessageParams,
  WebChatDeliverMessageParams,
  WebChatDeliverMessageResult,
  WebChatEditMessageParams,
  WebChatEventContext,
  WebChatProvisionInboundParams,
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
  isValidConversationId,
  isValidMessageId,
  MESSAGE_ID_PATTERN,
  toThreadId,
} from './utils.js';

export function createWebChatAdapter(config: WebChatAdapterConfig): Adapter<WebChatThreadId, WebChatRawMessage> {
  return new NovuWebChatAdapterImpl(config);
}
