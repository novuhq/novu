import type { Adapter } from 'chat';
import { NovuWebChatAdapterImpl } from './adapter.js';
import type { WebChatAdapterConfig, WebChatRawMessage, WebChatThreadId } from './types.js';

export type {
  WebChatAdapterConfig,
  WebChatDeleteMessageParams,
  WebChatDeliverMessageParams,
  WebChatDeliverMessageResult,
  WebChatEditMessageParams,
  WebChatRawMessage,
  WebChatRequestBody,
  WebChatSession,
  WebChatThreadId,
} from './types.js';

export {
  ADAPTER_NAME,
  CONVERSATION_ID_PATTERN,
  conversationIdFromThreadId,
  isValidConversationId,
  isValidMessageId,
  MESSAGE_ID_PATTERN,
  toThreadId,
} from './utils.js';

export function createWebChatAdapter(config: WebChatAdapterConfig): Adapter<WebChatThreadId, WebChatRawMessage> {
  return new NovuWebChatAdapterImpl(config);
}
