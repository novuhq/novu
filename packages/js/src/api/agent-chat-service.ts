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
}
