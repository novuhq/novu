import type { AgentMessage } from '@novu/agent-event-protocol';
import { AgentChatService, InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import { AgentChatStore } from './agent-chat-store';
import type { LoadConversationArgs, LoadConversationResult, SendMessageArgs, SendMessageResult } from './types';

export class AgentChat extends BaseModule {
  #agentChatService: AgentChatService;
  #store: AgentChatStore;
  /**
   * Per-agent chain for uncontrolled sends.
   * The first create must finish (and adopt `conv_*`) before the next POST omits
   * `conversationIdentifier` — otherwise the server mints two conversations.
   */
  #uncontrolledSendChain = new Map<string, Promise<unknown>>();

  constructor({
    inboxServiceInstance,
    eventEmitterInstance,
    agentChatService,
  }: {
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
    agentChatService: AgentChatService;
  }) {
    super({ inboxServiceInstance, eventEmitterInstance });
    this.#agentChatService = agentChatService;
    this.#store = new AgentChatStore((entry) => {
      this._emitter.emit('agent_chat.messages.updated', {
        data: {
          agentId: entry.agentId,
          conversationId: entry.conversationId,
          messages: entry.messages,
        },
      });
    });
  }

  clearCache(): void {
    this.#store.clear();
    this.#uncontrolledSendChain.clear();
  }

  getConversation({
    agentId,
    conversationId,
  }: {
    agentId: string;
    conversationId?: string;
  }): { conversationId?: string; messages: AgentMessage[] } | undefined {
    const entry = this.#store.get(agentId, conversationId);
    if (!entry) {
      return undefined;
    }

    return {
      conversationId: entry.conversationId,
      messages: entry.messages,
    };
  }

  /**
   * Fetch the newest history page and merge it into the local timeline.
   * Indexes by conversationId only — does not claim the uncontrolled agent draft.
   */
  async loadConversation(args: LoadConversationArgs): Result<LoadConversationResult> {
    return this.callWithSession(async () => {
      try {
        const page = await this.#agentChatService.getEvents({
          conversationId: args.conversationId,
        });

        const entry = this.#store.getOrCreate(args.agentId, args.conversationId);
        const next = this.#store.absorbHistoryPage(entry, page.events);

        return {
          data: {
            conversationId: args.conversationId,
            messages: next.messages,
          },
        };
      } catch (error) {
        return { error: new NovuError('Failed to load agent chat conversation', error) };
      }
    });
  }

  async sendMessage(args: SendMessageArgs): Result<SendMessageResult> {
    return this.callWithSession(async () => {
      // Controlled: explicit conversationId. Uncontrolled: agent draft (sticky resume).
      const entry = this.#store.getOrCreate(args.agentId, args.conversationId);
      const optimisticId = this.#store.appendSending(entry, args.text);

      const post = async (): Result<SendMessageResult> => {
        // Re-read after any prior uncontrolled create so sticky resume picks up conv_*.
        const live = this.#store.get(args.agentId, args.conversationId) ?? entry;
        const conversationId = args.conversationId ?? live.conversationId;

        try {
          const data = await this.#agentChatService.sendMessage({
            ...args,
            conversationId,
          });

          this.#store.markSent(entry, {
            optimisticMessageId: optimisticId,
            serverMessageId: data.messageId,
            conversationId: data.identifier,
          });

          return {
            data: {
              conversationId: data.identifier,
              messageId: data.messageId,
            },
          };
        } catch (error) {
          this.#store.markFailed(entry, optimisticId);

          return { error: new NovuError('Failed to send agent chat message', error) };
        }
      };

      // Paint optimistically immediately; only serialize the HTTP create so two
      // overlapping uncontrolled first-sends cannot mint two server conversations.
      if (!args.conversationId) {
        const previous = this.#uncontrolledSendChain.get(args.agentId) ?? Promise.resolve();
        const current = previous.then(post, post);
        this.#uncontrolledSendChain.set(
          args.agentId,
          current.then(
            () => undefined,
            () => undefined
          )
        );

        return current;
      }

      return post();
    });
  }
}
