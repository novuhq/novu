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
 * Credentials fall back to environment variables when omitted:
 * `NOVU_SECRET_KEY` (`apiKey` + `bridgeSecret`), `NOVU_AGENT_IDENTIFIER`
 * (`agentIdentifier`), `NOVU_API_BASE_URL` (`apiBaseUrl`), and
 * `NOVU_BRIDGE_URL` (`bridgeUrl`). Explicit config always takes precedence.
 *
 * @example
 *   import { Chat } from 'chat';
 *   import { createNovuAdapter } from '@novu/chat-sdk-adapter';
 *   import { createMemoryState } from '@chat-adapter/state-memory';
 *
 *   // Reads NOVU_SECRET_KEY + NOVU_AGENT_IDENTIFIER from the environment:
 *   const novu = createNovuAdapter();
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
export function createNovuAdapter(config: Partial<NovuAdapterConfig> = {}): NovuAdapter {
  const env = typeof process !== 'undefined' ? process.env : undefined;
  const apiKey = config.apiKey ?? env?.NOVU_SECRET_KEY;
  const bridgeSecret = config.bridgeSecret ?? env?.NOVU_SECRET_KEY;
  const agentIdentifier = config.agentIdentifier ?? env?.NOVU_AGENT_IDENTIFIER;
  const apiBaseUrl = config.apiBaseUrl ?? env?.NOVU_API_BASE_URL;
  const bridgeUrl = config.bridgeUrl ?? env?.NOVU_BRIDGE_URL;

  if (!apiKey) {
    throw new Error('createNovuAdapter: `apiKey` is required (pass it or set NOVU_SECRET_KEY).');
  }
  if (!agentIdentifier) {
    throw new Error('createNovuAdapter: `agentIdentifier` is required (pass it or set NOVU_AGENT_IDENTIFIER).');
  }
  if (!bridgeSecret) {
    throw new Error('createNovuAdapter: `bridgeSecret` is required (pass it or set NOVU_SECRET_KEY).');
  }

  return new NovuAdapterImpl({
    ...config,
    apiKey,
    agentIdentifier,
    bridgeSecret,
    apiBaseUrl,
    bridgeUrl,
  }) as NovuAdapter;
}
