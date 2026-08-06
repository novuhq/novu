import { AgentChatService, InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import type { SendMessageArgs, SendMessageResult } from './types';

export class AgentChat extends BaseModule {
  #agentChatService: AgentChatService;

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
  }

  async sendMessage(args: SendMessageArgs): Result<SendMessageResult> {
    return this.callWithSession(async () => {
      try {
        const data = await this.#agentChatService.sendMessage(args);

        return { data: { conversationId: data.identifier } };
      } catch (error) {
        return { error: new NovuError('Failed to send agent chat message', error) };
      }
    });
  }
}
