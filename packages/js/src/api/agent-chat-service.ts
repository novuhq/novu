import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { HttpClient } from './http-client';

// TODO(NV-8553): rename path to `/agent-chat/conversations` when platform rename lands
const AGENT_CHAT_CONVERSATIONS_ROUTE = '/web-chat/conversations';

export type AgentChatSendMessageArgs = {
  agentId: string;
  text: string;
  /** Existing conversation id. Omit this field to create a new conversation. */
  conversationId?: string;
  /**
   * HMAC-SHA256(env secret, agentId) hex. Required when the env's `novu-web-chat`
   * integration has Security HMAC enabled.
   */
  agentHash?: string;
};

export type AgentChatSendMessageResponse = {
  identifier: string;
  messageId: string;
};

export type AgentChatGetEventsArgs = {
  conversationId: string;
  /** Activity `_id` cursor that loads older history. Omit to get the newest page. */
  before?: string;
  limit?: number;
};

export type AgentChatGetEventsResponse = {
  events: AgentEventEnvelope[];
  /** Cursor for older history. */
  olderCursor: string | null;
};

export type AgentChatRespondToApprovalArgs = {
  agentId: string;
  conversationId: string;
  /** Server-minted approve/deny action id echoed from the pending approval part. */
  actionId: string;
  /**
   * HMAC-SHA256(env secret, agentId) hex. Required when the env's `novu-web-chat`
   * integration has Security HMAC enabled.
   */
  agentHash?: string;
};

export type AgentChatRespondToApprovalResponse = {
  identifier: string;
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
      ...(args.agentHash ? { agentHash: args.agentHash } : {}),
    });
  }

  async respondToApproval(args: AgentChatRespondToApprovalArgs): Promise<AgentChatRespondToApprovalResponse> {
    return this.#httpClient.post(AGENT_CHAT_CONVERSATIONS_ROUTE, {
      agentId: args.agentId,
      conversationIdentifier: args.conversationId,
      actionId: args.actionId,
      ...(args.agentHash ? { agentHash: args.agentHash } : {}),
    });
  }

  async getEvents(args: AgentChatGetEventsArgs): Promise<AgentChatGetEventsResponse> {
    const params = new URLSearchParams();
    if (args.before) {
      params.set('before', args.before);
    }
    if (args.limit != null) {
      params.set('limit', String(args.limit));
    }

    const query = params.toString();
    const suffix = query ? `?${query}` : '';

    return this.#httpClient.get(
      `${AGENT_CHAT_CONVERSATIONS_ROUTE}/${encodeURIComponent(args.conversationId)}/events${suffix}`
    );
  }
}
