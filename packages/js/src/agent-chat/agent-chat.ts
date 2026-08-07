import type { AgentMessage } from '@novu/agent-event-protocol';
import { AgentChatService, InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import { AgentChatStore, type ConversationEntry, createLocalConversationKey } from './agent-chat-store';
import type { LoadConversationArgs, LoadConversationResult, SendMessageArgs, SendMessageResult } from './types';

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
          key: entry.key,
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
    key,
  }: {
    agentId: string;
    conversationId?: string;
    key?: string;
  }): { conversationId?: string; messages: AgentMessage[]; key: string } | undefined {
    const entry = key
      ? this.#store.get(key)
      : conversationId
        ? (this.#store.get(conversationId) ?? this.#store.getByConversationId(agentId, conversationId))
        : undefined;

    if (!entry || entry.agentId !== agentId) {
      return undefined;
    }

    return {
      conversationId: entry.conversationId,
      messages: entry.messages,
      key: entry.key,
    };
  }

  /**
   * Fetch the newest history page and merge it into the local timeline.
   * Holder key is the public conversation id (resume).
   */
  async loadConversation(args: LoadConversationArgs): Result<LoadConversationResult> {
    return this.callWithSession(async () => {
      try {
        const page = await this.#agentChatService.getEvents({
          conversationId: args.conversationId,
        });

        const entry = this.#store.getOrCreate({
          agentId: args.agentId,
          key: args.conversationId,
          conversationId: args.conversationId,
        });
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
      const key = args.key ?? args.conversationId ?? createLocalConversationKey();
      const entry = this.#resolveSendEntry(args, key);
      const optimisticId = this.#store.appendSending(entry, args.text);

      return this.#store.withCreateClaim(entry, args.conversationId, async (conversationId) => {
        try {
          const data = await this.#agentChatService.sendMessage({
            agentId: args.agentId,
            text: args.text,
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
      });
    });
  }

  /**
   * Resolve the holder for a send. Rejects a key that belongs to another agent
   * or a different claimed conversation (stale session key after prop change).
   */
  #resolveSendEntry(args: SendMessageArgs, key: string): ConversationEntry {
    const byKey = this.#store.get(key);
    if (byKey && this.#isUsableSendEntry(byKey, args)) {
      return byKey;
    }

    if (args.conversationId) {
      return (
        this.#store.getByConversationId(args.agentId, args.conversationId) ??
        this.#store.getOrCreate({
          agentId: args.agentId,
          key: args.conversationId,
          conversationId: args.conversationId,
        })
      );
    }

    // Stale key must not call getOrCreate(key) — that would return the wrong holder.
    const createKey = byKey ? createLocalConversationKey() : key;

    return this.#store.getOrCreate({
      agentId: args.agentId,
      key: createKey,
    });
  }

  #isUsableSendEntry(entry: ConversationEntry, args: SendMessageArgs): boolean {
    if (entry.agentId !== args.agentId) {
      return false;
    }

    if (
      args.conversationId !== undefined &&
      entry.conversationId !== undefined &&
      entry.conversationId !== args.conversationId
    ) {
      return false;
    }

    return true;
  }
}
