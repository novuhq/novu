import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import { Result } from '../types';
import { NovuError } from '../utils/errors';
import type { CardElement } from './card-elements';
import { type DataStreamFrame, parseDataStream } from './data-stream-parser';
import type {
  Conversation,
  ConversationMessage,
  ConversationMessagePart,
  ConversationMessagesResponse,
  ConversationTypingState,
  FetchConversationMessagesArgs,
  GetConversationArgs,
  ListConversationsArgs,
  ListConversationsResponse,
  SendConversationActionArgs,
  SendConversationMessageArgs,
  WebConversationMessageDto,
} from './types';

function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface MessageContentPayload {
  markdown?: string;
  card?: CardElement;
  files?: Array<{ filename?: string; mimeType?: string; size?: number; url: string }>;
}

function partsFromContent(content: MessageContentPayload): ConversationMessagePart[] {
  const parts: ConversationMessagePart[] = [];

  if (typeof content.markdown === 'string') {
    parts.push({ type: 'text', markdown: content.markdown });
  }
  if (content.card && typeof content.card === 'object') {
    parts.push({ type: 'card', card: content.card });
  }
  if (Array.isArray(content.files)) {
    for (const file of content.files) {
      if (file && typeof file.url === 'string' && file.url) {
        parts.push({ type: 'file', ...file });
      }
    }
  }

  return parts;
}

function dtoToMessage(dto: WebConversationMessageDto): ConversationMessage {
  return { ...dto, status: 'complete' };
}

/**
 * Web agent chat: multi-conversation messaging with agents over the
 * subscriber-JWT session shared with the Inbox. Message sends stream the
 * agent's turn back over SSE (AI SDK data-stream protocol); replies arriving
 * after the stream closes are picked up by the next `fetchMessages` refetch.
 *
 * Local message state is held per conversation and broadcast through
 * `conversation.messages.updated` — UI layers (e.g. `useConversation` in
 * `@novu/react`) subscribe to that instead of managing stream state.
 */
export class Conversations extends BaseModule {
  readonly #messages = new Map<string, ConversationMessage[]>();
  readonly #typing = new Map<string, ConversationTypingState>();
  readonly #activeStreams = new Set<string>();

  constructor({
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({ inboxServiceInstance, eventEmitterInstance });
  }

  async list(args: ListConversationsArgs): Result<ListConversationsResponse> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('conversations.list.pending', { args });

        const response = await this._inboxService.listWebConversations(args);
        const data: ListConversationsResponse = {
          conversations: response.data as Conversation[],
          hasMore: response.hasMore,
        };

        this._emitter.emit('conversations.list.resolved', { args, data });

        return { data };
      } catch (error) {
        this._emitter.emit('conversations.list.resolved', { args, error });

        return { error: new NovuError('Failed to fetch conversations', error) };
      }
    });
  }

  async get(args: GetConversationArgs): Result<Conversation> {
    return this.callWithSession(async () => {
      try {
        const data = (await this._inboxService.getWebConversation(args)) as Conversation;

        return { data };
      } catch (error) {
        return { error: new NovuError('Failed to fetch conversation', error) };
      }
    });
  }

  async fetchMessages(args: FetchConversationMessagesArgs): Result<ConversationMessagesResponse> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('conversation.messages.pending', { args });

        const response = await this._inboxService.listWebConversationMessages(args);
        const fetched = response.data.map(dtoToMessage);

        const key = this.#storeKey(args.agent, args.conversationId);
        const merged = args.before ? [...fetched, ...(this.#messages.get(key) ?? [])] : fetched;
        this.#setMessages(args.agent, args.conversationId, this.#mergeLocalOnly(key, merged));

        const data: ConversationMessagesResponse = {
          messages: this.getMessagesSnapshot(args),
          hasMore: response.hasMore,
        };

        this._emitter.emit('conversation.messages.resolved', { args, data });

        return { data };
      } catch (error) {
        this._emitter.emit('conversation.messages.resolved', { args, error });

        return { error: new NovuError('Failed to fetch conversation messages', error) };
      }
    });
  }

  async send(args: SendConversationMessageArgs): Result<ConversationMessage> {
    return this.callWithSession(async () => {
      const key = this.#storeKey(args.agent, args.conversationId);
      const userMessage: ConversationMessage = {
        id: args.clientMessageId ?? generateLocalId(),
        role: 'user',
        parts: [{ type: 'text', markdown: args.text }],
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      this.#appendMessage(args.agent, args.conversationId, userMessage);
      this._emitter.emit('conversation.send.pending', { args, data: userMessage });

      try {
        const response = await this._inboxService.streamWebConversationMessage({
          agent: args.agent,
          conversationId: args.conversationId,
          integrationIdentifier: args.integrationIdentifier,
          signal: args.signal,
          body: { text: args.text, clientMessageId: userMessage.id },
        });

        this.#patchMessage(args.agent, args.conversationId, userMessage.id, { status: 'sent' });
        await this.#consumeStream(args.agent, args.conversationId, key, response);

        this.#patchMessage(args.agent, args.conversationId, userMessage.id, { status: 'complete' });
        this._emitter.emit('conversation.send.resolved', { args, data: userMessage });

        return { data: userMessage };
      } catch (error) {
        this.#patchMessage(args.agent, args.conversationId, userMessage.id, { status: 'failed' });
        this.#setTyping(args.agent, args.conversationId, { isTyping: false });
        this._emitter.emit('conversation.turn.updated', {
          agent: args.agent,
          conversationId: args.conversationId,
          status: 'error',
          error,
        });
        this._emitter.emit('conversation.send.resolved', { args, error });

        return { error: new NovuError('Failed to send message', error) };
      }
    });
  }

  async sendAction(args: SendConversationActionArgs): Result<void> {
    return this.callWithSession(async () => {
      const key = this.#storeKey(args.agent, args.conversationId);

      try {
        this._emitter.emit('conversation.action.pending', { args });

        const response = await this._inboxService.streamWebConversationAction({
          agent: args.agent,
          conversationId: args.conversationId,
          integrationIdentifier: args.integrationIdentifier,
          signal: args.signal,
          body: { actionId: args.actionId, value: args.value, sourceMessageId: args.sourceMessageId },
        });

        await this.#consumeStream(args.agent, args.conversationId, key, response);
        this._emitter.emit('conversation.action.resolved', { args });

        return { data: undefined };
      } catch (error) {
        this.#setTyping(args.agent, args.conversationId, { isTyping: false });
        this._emitter.emit('conversation.turn.updated', {
          agent: args.agent,
          conversationId: args.conversationId,
          status: 'error',
          error,
        });
        this._emitter.emit('conversation.action.resolved', { args, error });

        return { error: new NovuError('Failed to send action', error) };
      }
    });
  }

  getMessagesSnapshot(args: { agent: string; conversationId: string }): ConversationMessage[] {
    return [...(this.#messages.get(this.#storeKey(args.agent, args.conversationId)) ?? [])];
  }

  getTypingSnapshot(args: { agent: string; conversationId: string }): ConversationTypingState {
    return this.#typing.get(this.#storeKey(args.agent, args.conversationId)) ?? { isTyping: false };
  }

  isStreaming(args: { agent: string; conversationId: string }): boolean {
    return this.#activeStreams.has(this.#storeKey(args.agent, args.conversationId));
  }

  clear(args: { agent: string; conversationId: string }): void {
    const key = this.#storeKey(args.agent, args.conversationId);
    this.#messages.delete(key);
    this.#typing.delete(key);
  }

  // -- Stream handling --

  async #consumeStream(agent: string, conversationId: string, key: string, response: Response): Promise<void> {
    if (!response.body) {
      return;
    }

    this.#activeStreams.add(key);
    this._emitter.emit('conversation.turn.updated', { agent, conversationId, status: 'streaming' });

    try {
      for await (const frame of parseDataStream(response.body)) {
        this.#applyFrame(agent, conversationId, frame);
      }
    } finally {
      this.#activeStreams.delete(key);
      this.#setTyping(agent, conversationId, { isTyping: false });
      this._emitter.emit('conversation.turn.updated', { agent, conversationId, status: 'idle' });
    }
  }

  #applyFrame(agent: string, conversationId: string, frame: DataStreamFrame): void {
    switch (frame.type) {
      case 'data-message-start': {
        const data = frame.data as { messageId?: string; createdAt?: string } | undefined;
        if (data?.messageId) {
          this.#ensureAgentMessage(agent, conversationId, data.messageId, data.createdAt);
        }
        break;
      }
      case 'text-start': {
        if (typeof frame.id === 'string') {
          this.#ensureAgentMessage(agent, conversationId, frame.id);
        }
        break;
      }
      case 'text-delta': {
        if (typeof frame.id === 'string' && typeof frame.delta === 'string') {
          this.#appendTextDelta(agent, conversationId, frame.id, frame.delta);
        }
        break;
      }
      case 'data-card': {
        const data = frame.data as { card?: CardElement } | undefined;
        if (typeof frame.id === 'string' && data?.card) {
          this.#appendPart(agent, conversationId, frame.id, { type: 'card', card: data.card });
        }
        break;
      }
      case 'data-files': {
        const data = frame.data as { files?: MessageContentPayload['files'] } | undefined;
        if (typeof frame.id === 'string' && Array.isArray(data?.files)) {
          for (const part of partsFromContent({ files: data.files })) {
            this.#appendPart(agent, conversationId, frame.id, part);
          }
        }
        break;
      }
      case 'data-message-edit': {
        const data = frame.data as { messageId?: string; content?: MessageContentPayload } | undefined;
        if (data?.messageId && data.content) {
          this.#patchMessage(agent, conversationId, data.messageId, {
            parts: partsFromContent(data.content),
            isEdited: true,
          });
        }
        break;
      }
      case 'data-message-delete': {
        const data = frame.data as { messageId?: string } | undefined;
        if (data?.messageId) {
          this.#removeMessage(agent, conversationId, data.messageId);
        }
        break;
      }
      case 'data-typing': {
        const data = frame.data as { status?: string } | undefined;
        const status = typeof data?.status === 'string' ? data.status : '';
        this.#setTyping(agent, conversationId, { isTyping: status !== '', status: status || undefined });
        break;
      }
      case 'error': {
        throw new Error(typeof frame.errorText === 'string' ? frame.errorText : 'Agent turn failed');
      }
      default:
        // Unknown frames (start, finish, text-end, data-reaction, ...) are protocol
        // bookkeeping or forward-compatible extensions — safely ignored.
        break;
    }
  }

  // -- Local store --

  #storeKey(agent: string, conversationId: string): string {
    return `${agent}:${conversationId}`;
  }

  #setMessages(agent: string, conversationId: string, messages: ConversationMessage[]): void {
    this.#messages.set(this.#storeKey(agent, conversationId), messages);
    this._emitter.emit('conversation.messages.updated', { agent, conversationId, messages: [...messages] });
  }

  /** Keeps locally-known messages the server page does not contain (optimistic sends, live-streamed replies). */
  #mergeLocalOnly(key: string, fetched: ConversationMessage[]): ConversationMessage[] {
    const existing = this.#messages.get(key);
    if (!existing?.length) {
      return fetched;
    }

    const fetchedIds = new Set(fetched.map((message) => message.id));
    const localOnly = existing.filter((message) => !fetchedIds.has(message.id));

    if (!localOnly.length) {
      return fetched;
    }

    return [...fetched, ...localOnly].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  #appendMessage(agent: string, conversationId: string, message: ConversationMessage): void {
    const key = this.#storeKey(agent, conversationId);
    this.#setMessages(agent, conversationId, [...(this.#messages.get(key) ?? []), message]);
  }

  #ensureAgentMessage(
    agent: string,
    conversationId: string,
    messageId: string,
    createdAt?: string
  ): ConversationMessage {
    const key = this.#storeKey(agent, conversationId);
    const existing = (this.#messages.get(key) ?? []).find((message) => message.id === messageId);
    if (existing) {
      return existing;
    }

    const message: ConversationMessage = {
      id: messageId,
      role: 'agent',
      parts: [],
      createdAt: createdAt ?? new Date().toISOString(),
      status: 'complete',
    };
    this.#appendMessage(agent, conversationId, message);

    return message;
  }

  #appendTextDelta(agent: string, conversationId: string, messageId: string, delta: string): void {
    this.#ensureAgentMessage(agent, conversationId, messageId);
    this.#mutateMessage(agent, conversationId, messageId, (message) => {
      const lastPart = message.parts[message.parts.length - 1];
      if (lastPart?.type === 'text') {
        return {
          ...message,
          parts: [...message.parts.slice(0, -1), { ...lastPart, markdown: lastPart.markdown + delta }],
        };
      }

      return { ...message, parts: [...message.parts, { type: 'text', markdown: delta }] };
    });
  }

  #appendPart(agent: string, conversationId: string, messageId: string, part: ConversationMessagePart): void {
    this.#ensureAgentMessage(agent, conversationId, messageId);
    this.#mutateMessage(agent, conversationId, messageId, (message) => ({
      ...message,
      parts: [...message.parts, part],
    }));
  }

  #patchMessage(
    agent: string,
    conversationId: string,
    messageId: string,
    patch: Partial<Pick<ConversationMessage, 'status' | 'parts' | 'isEdited'>>
  ): void {
    this.#mutateMessage(agent, conversationId, messageId, (message) => ({ ...message, ...patch }));
  }

  #mutateMessage(
    agent: string,
    conversationId: string,
    messageId: string,
    mutate: (message: ConversationMessage) => ConversationMessage
  ): void {
    const key = this.#storeKey(agent, conversationId);
    const messages = this.#messages.get(key);
    if (!messages) return;

    let changed = false;
    const next = messages.map((message) => {
      if (message.id !== messageId) return message;
      changed = true;

      return mutate(message);
    });

    if (changed) {
      this.#setMessages(agent, conversationId, next);
    }
  }

  #removeMessage(agent: string, conversationId: string, messageId: string): void {
    const key = this.#storeKey(agent, conversationId);
    const messages = this.#messages.get(key);
    if (!messages) return;

    const next = messages.filter((message) => message.id !== messageId);
    if (next.length !== messages.length) {
      this.#setMessages(agent, conversationId, next);
    }
  }

  #setTyping(agent: string, conversationId: string, state: ConversationTypingState): void {
    this.#typing.set(this.#storeKey(agent, conversationId), state);
    this._emitter.emit('conversation.typing.updated', { agent, conversationId, ...state });
  }
}
