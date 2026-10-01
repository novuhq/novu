import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type {
  AgentHashFields,
  ListConversationsArgs,
  ListConversationsResult,
  WebChatConversation,
} from '../web-chat/types';
import { validateHistoryPageResponse } from '../web-chat/validate-envelope';
import { WebChatPlanLimitError, type WebChatPlanLimitReason } from '../web-chat/web-chat-plan-limit-error';
import { HttpClient } from './http-client';

const WEB_CHAT_CONVERSATIONS_ROUTE = '/web-chat/conversations';

export { WebChatPlanLimitError, type WebChatPlanLimitReason };

export type WebChatSendMessageArgs = AgentHashFields & {
  agentId: string;
  text: string;
  metadata?: Record<string, unknown>;
  /** Existing conversation id. Omit this field to create a new conversation. */
  conversationId?: string;
  /** Client-minted idempotency key (`msg_*`). Retries must reuse the same value. */
  messageId?: string;
};

export type WebChatSendMessageResponse = {
  identifier: string;
  messageId: string;
};

export type WebChatGetEventsArgs = {
  conversationId: string;
  /** Activity `_id` cursor that loads older history. Omit to get the newest page. */
  before?: string;
  limit?: number;
};

export type WebChatGetEventsResponse = {
  events: AgentEventEnvelope[];
  /** Cursor for older history. */
  olderCursor: string | null;
};

export type WebChatRespondToActionArgs = AgentHashFields & {
  agentId: string;
  conversationId: string;
  /** Server-minted approve/deny action id echoed from the pending approval part. */
  actionId: string;
  /** Client-minted idempotency key (`idem_*`). Retries must reuse the same value. */
  idempotencyKey?: string;
};

export type WebChatSendActionArgs = AgentHashFields & {
  agentId: string;
  conversationId: string;
  /** `id` of the clicked Card button. */
  actionId: string;
  /** Platform message id of the message that carries the Card. */
  sourceMessageId: string;
  /** `value` of the clicked Card button, if set. */
  value?: string;
  /** Client-minted idempotency key (`idem_*`). Retries must reuse the same value. */
  idempotencyKey?: string;
};

export type WebChatRespondToActionResponse = {
  identifier: string;
};

export class WebChatService {
  #httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.#httpClient = httpClient;
  }

  async sendMessage(args: WebChatSendMessageArgs): Promise<WebChatSendMessageResponse> {
    return this.#postAccept({
      agentId: args.agentId,
      text: args.text,
      ...(args.conversationId ? { conversationIdentifier: args.conversationId } : {}),
      ...(args.messageId ? { messageId: args.messageId } : {}),
      ...(args.agentHash ? { agentHash: args.agentHash } : {}),
      ...(args.metadata ? { metadata: args.metadata } : {}),
    });
  }

  async respondToAction(args: WebChatRespondToActionArgs): Promise<WebChatRespondToActionResponse> {
    return this.#postAccept({
      agentId: args.agentId,
      conversationIdentifier: args.conversationId,
      actionId: args.actionId,
      ...(args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : {}),
      ...(args.agentHash ? { agentHash: args.agentHash } : {}),
    });
  }

  async sendAction(args: WebChatSendActionArgs): Promise<WebChatRespondToActionResponse> {
    return this.#postAccept({
      agentId: args.agentId,
      conversationIdentifier: args.conversationId,
      actionId: args.actionId,
      sourceMessageId: args.sourceMessageId,
      ...(args.value !== undefined ? { value: args.value } : {}),
      ...(args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : {}),
      ...(args.agentHash ? { agentHash: args.agentHash } : {}),
    });
  }

  async #postAccept<T extends WebChatSendMessageResponse | WebChatRespondToActionResponse>(
    body: Record<string, unknown>
  ): Promise<T> {
    try {
      return await this.#httpClient.post<T>(WEB_CHAT_CONVERSATIONS_ROUTE, body);
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
      return new WebChatPlanLimitError(body.reason, body.message);
    }

    return err;
  }

  async listConversations(args: ListConversationsArgs = {}): Promise<ListConversationsResult> {
    const params = new URLSearchParams();
    if (args.limit != null) {
      params.set('limit', String(args.limit));
    }
    if (args.after) {
      params.set('after', args.after);
    }
    if (args.before) {
      params.set('before', args.before);
    }
    if (args.orderBy) {
      params.set('orderBy', args.orderBy);
    }
    if (args.orderDirection) {
      params.set('orderDirection', args.orderDirection);
    }

    const raw = await this.#httpClient.get<{
      data?: WebChatConversation[];
      next?: string | null;
      previous?: string | null;
    }>(WEB_CHAT_CONVERSATIONS_ROUTE, params.toString() ? params : undefined, false);

    return {
      conversations: raw.data ?? [],
      next: raw.next ?? null,
      previous: raw.previous ?? null,
    };
  }

  async getEvents(args: WebChatGetEventsArgs): Promise<WebChatGetEventsResponse> {
    const params = new URLSearchParams();
    if (args.before) {
      params.set('before', args.before);
    }
    if (args.limit != null) {
      params.set('limit', String(args.limit));
    }

    const query = params.toString();
    const suffix = query ? `?${query}` : '';

    const raw = await this.#httpClient.get<unknown>(
      `${WEB_CHAT_CONVERSATIONS_ROUTE}/${encodeURIComponent(args.conversationId)}/events${suffix}`
    );

    const validated = validateHistoryPageResponse(raw);
    if (!validated.ok) {
      throw new Error(validated.error.message);
    }

    return {
      events: validated.events,
      olderCursor: validated.olderCursor,
    };
  }
}
