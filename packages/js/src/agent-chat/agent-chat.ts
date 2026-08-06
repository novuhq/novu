import type { AgentMessage } from '@novu/agent-event-protocol';
import { AgentChatService, InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import { AgentChatStore } from './agent-chat-store';
import type { SendMessageArgs, SendMessageResult } from './types';

export class AgentChat extends BaseModule {
  #agentChatService: AgentChatService;
  #store: AgentChatStore;

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

  async sendMessage(args: SendMessageArgs): Result<SendMessageResult> {
    return this.callWithSession(async () => {
      const entry = this.#store.getOrCreate(args.agentId, args.conversationId);
      const optimisticId = this.#store.appendSending(entry, args.text);

      try {
        const live = this.#store.get(args.agentId, args.conversationId) ?? this.#store.get(args.agentId);
        const data = await this.#agentChatService.sendMessage({
          ...args,
          conversationId: args.conversationId ?? live?.conversationId,
        });

        this.#store.markSent(entry, optimisticId, data.identifier);

        return { data: { conversationId: data.identifier } };
      } catch (error) {
        this.#store.markFailed(entry, optimisticId);

        return { error: new NovuError('Failed to send agent chat message', error) };
      }
    });
  }
}
