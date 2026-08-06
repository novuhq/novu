import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import type { SendMessageArgs, SendMessageResult } from './types';

export class AgentChat extends BaseModule {
  constructor({
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({ inboxServiceInstance, eventEmitterInstance });
  }

  async sendMessage(args: SendMessageArgs): Result<SendMessageResult> {
    return this.callWithSession(async () => {
      void args;

      return {
        error: new NovuError(
          'AgentChat.sendMessage is not wired yet — WebChatService comes next',
          new Error('Not implemented')
        ),
      };
    });
  }
}
