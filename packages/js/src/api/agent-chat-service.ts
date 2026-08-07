import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { HttpClient } from './http-client';

// TODO(NV-8553): rename path to `/agent-chat/conversations` when platform rename lands
const AGENT_CHAT_CONVERSATIONS_ROUTE = '/web-chat/conversations';

export type AgentChatSendMessageArgs = {
  agentId: string;
  text: string;
  /** Existing conversation id. Omit this field to create a new conversation. */
  conversationId?: string;
};

export type AgentChatSendMessageResponse = {
  identifier: string;
  messageId: string;
};

export type AgentChatGetEventsArgs = {
  conversationId: string;
};

export type AgentChatGetEventsResponse = {
  events: AgentEventEnvelope[];
  /** Cursor for older history. */
  olderCursor: string | null;
};

export class AgentChatService {
  #httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.#httpClient = httpClient;
  }

  async sendMessage(args: AgentChatSendMessageArgs): Promise<AgentChatSendMessageResponse> {
    return this.#httpClient.post(AGENT_CHAT_CONVERSATIONS_ROUTE, {
      agentId: args.agentId,
      text: args.text,
      ...(args.conversationId ? { conversationIdentifier: args.conversationId } : {}),
    });
  }

  async getEvents(args: AgentChatGetEventsArgs): Promise<AgentChatGetEventsResponse> {
    return this.#httpClient.get(`${AGENT_CHAT_CONVERSATIONS_ROUTE}/${encodeURIComponent(args.conversationId)}/events`);
  }
}
