import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type { AgentHashFields } from '../agent-chat/types';
import { HttpClient } from './http-client';

const AGENT_CHAT_CONVERSATIONS_ROUTE = '/agent-chat/conversations';

export type AgentChatPlanLimitReason = 'agents' | 'channels' | 'conversations';

export class AgentChatPlanLimitError extends Error {
  readonly reason: AgentChatPlanLimitReason;

  constructor(reason: AgentChatPlanLimitReason, message: string) {
    super(message);
    this.name = 'AgentChatPlanLimitError';
    this.reason = reason;
  }
}

export type AgentChatSendMessageArgs = AgentHashFields & {
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
  /** Activity `_id` cursor that loads older history. Omit to get the newest page. */
  before?: string;
  limit?: number;
};

export type AgentChatGetEventsResponse = {
  events: AgentEventEnvelope[];
  /** Cursor for older history. */
  olderCursor: string | null;
};

export type AgentChatRespondToActionArgs = AgentHashFields & {
  agentId: string;
  conversationId: string;
  /** Server-minted approve/deny action id echoed from the pending approval part. */
  actionId: string;
};

export type AgentChatSendActionArgs = AgentHashFields & {
  agentId: string;
  conversationId: string;
  /** `id` of the clicked Card button. */
  actionId: string;
  /** Platform message id of the message that carries the Card. */
  sourceMessageId: string;
  /** `value` of the clicked Card button, if set. */
  value?: string;
};

export type AgentChatRespondToActionResponse = {
  identifier: string;
};

export class AgentChatService {
  #httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.#httpClient = httpClient;
  }

  async sendMessage(args: AgentChatSendMessageArgs): Promise<AgentChatSendMessageResponse> {
    return this.#postAccept({
      agentId: args.agentId,
      text: args.text,
      ...(args.conversationId ? { conversationIdentifier: args.conversationId } : {}),
      ...(args.agentHash ? { agentHash: args.agentHash } : {}),
    });
  }

  async respondToAction(args: AgentChatRespondToActionArgs): Promise<AgentChatRespondToActionResponse> {
    return this.#postAccept({
      agentId: args.agentId,
      conversationIdentifier: args.conversationId,
      actionId: args.actionId,
      ...(args.agentHash ? { agentHash: args.agentHash } : {}),
    });
  }

  async sendAction(args: AgentChatSendActionArgs): Promise<AgentChatRespondToActionResponse> {
    return this.#postAccept({
      agentId: args.agentId,
      conversationIdentifier: args.conversationId,
      actionId: args.actionId,
      sourceMessageId: args.sourceMessageId,
      ...(args.value !== undefined ? { value: args.value } : {}),
      ...(args.agentHash ? { agentHash: args.agentHash } : {}),
    });
  }

  async #postAccept<T extends AgentChatSendMessageResponse | AgentChatRespondToActionResponse>(
    body: Record<string, string>
  ): Promise<T> {
    try {
      return await this.#httpClient.post<T>(AGENT_CHAT_CONVERSATIONS_ROUTE, body);
    } catch (err) {
      throw this.#maybeRethrowPlanLimitError(err);
    }
  }

  #maybeRethrowPlanLimitError(err: unknown): Error {
    if (!(err instanceof Error)) {
      return new Error(String(err));
    }

    const status = (err as Error & { status?: number }).status;
    const body = (err as Error & { body?: { reason?: string; message?: string } }).body;
    if (
      status === 402 &&
      body &&
      typeof body.reason === 'string' &&
      typeof body.message === 'string' &&
      (body.reason === 'agents' || body.reason === 'channels' || body.reason === 'conversations')
    ) {
      return new AgentChatPlanLimitError(body.reason, body.message);
    }

    return err;
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
