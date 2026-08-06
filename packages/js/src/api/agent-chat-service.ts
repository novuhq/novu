import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { HttpClient } from './http-client';

// TODO(NV-8553): rename path to `/agent-chat/conversations` when platform rename lands
const AGENT_CHAT_CONVERSATIONS_ROUTE = '/web-chat/conversations';

export type AgentChatSendMessageArgs = {
  agentId: string;
  text: string;
  /** Resume an existing conversation (`conv_*`). */
  conversationId?: string;
};

export type AgentChatSendMessageResponse = {
  identifier: string;
  messageId: string;
};

export type AgentChatGetEventsArgs = {
  conversationId: string;
  after?: string;
  before?: string;
  afterSequence?: number;
  limit?: number;
};

export type AgentChatGetEventsResponse = {
  events: AgentEventEnvelope[];
  hasMore: boolean;
  next: string | null;
  previous: string | null;
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
    const searchParams = new URLSearchParams();
    if (args.after) {
      searchParams.set('after', args.after);
    }
    if (args.before) {
      searchParams.set('before', args.before);
    }
    if (args.afterSequence !== undefined) {
      searchParams.set('afterSequence', String(args.afterSequence));
    }
    if (args.limit !== undefined) {
      searchParams.set('limit', String(args.limit));
    }

    return this.#httpClient.get(
      `${AGENT_CHAT_CONVERSATIONS_ROUTE}/${encodeURIComponent(args.conversationId)}/events`,
      searchParams
    );
  }
}
