import { NovuAdapterImpl } from './adapter.js';
import type { NovuAdapter, NovuAdapterConfig } from './types.js';

export { getNovuContext } from './novu-context.js';
export { verifyNovuSignature } from './signature.js';

export type {
  AddReactionPayload,
  AgentAction,
  AgentAttachment,
  AgentBridgeRequest,
  AgentConversation,
  AgentEmailContext,
  AgentEmailDomainContext,
  AgentEmailRouteContext,
  AgentHistoryEntry,
  AgentMessage,
  AgentMessageAuthor,
  AgentReaction,
  AgentReplyPayload,
  AgentSubscriber,
  NovuAdapter,
  NovuAdapterConfig,
  NovuContext,
  NovuHistoryFields,
  NovuRawMessage,
  NovuThreadId,
  NovuTypedAdapter,
  ReplyContent,
  ReplyFileRef,
  Signal,
  TriggerRecipientsPayload,
} from './types.js';
export { AgentEvent } from './types.js';

/**
 * Create a Chat SDK adapter that exposes Novu's normalized chat channels
 * (Slack, WhatsApp, Teams, Telegram, Email) as one platform. The developer's
 * Chat SDK app becomes the bridge: one handler set serves all channels.
 *
 * @example
 *   import { Chat } from 'chat';
 *   import { createNovuAdapter } from '@novu/chat-sdk-adapter';
 *   import { createMemoryState } from '@chat-adapter/state-memory';
 *
 *   const novu = createNovuAdapter({
 *     apiKey: process.env.NOVU_SECRET_KEY!,
 *     agentIdentifier: 'support-agent',
 *     bridgeSecret: process.env.NOVU_SECRET_KEY!,
 *   });
 *
 *   const chat = new Chat({ userName: 'support', adapters: { novu }, state: createMemoryState() });
 *
 *   chat.onNewMention(async (thread, message) => {
 *     if (thread.isDM) await thread.post(`Hi (DM)! You said: ${message.text}`);
 *     else await thread.post(`Hi! You said: ${message.text}`);
 *   });
 *   chat.onSubscribedMessage(async (thread, message) => {
 *     await thread.post(`echo: ${message.text}`);
 *   });
 */
export function createNovuAdapter(config: NovuAdapterConfig): NovuAdapter {
  return new NovuAdapterImpl(config) as NovuAdapter;
}
