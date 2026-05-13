import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { AgentEntity, ConversationEntity, SubscriberEntity } from '@novu/dal';
import type { AgentPlatformContext } from '@novu/framework';
import type { Message } from 'chat';
import type { ResolvedAgentConfig } from './agent-config-resolver.service';

export interface ManagedRuntimeParams {
  agent: AgentEntity;
  config: ResolvedAgentConfig;
  conversation: ConversationEntity;
  subscriber: SubscriberEntity | null;
  message: Message;
  platformContext: AgentPlatformContext;
}

@Injectable()
export class ManagedRuntimeService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(params: ManagedRuntimeParams): Promise<void> {
    this.logger.info(
      `Managed runtime invoked for agent ${params.agent._id}, conversation ${params.conversation._id} — queue not yet wired`
    );

    // Step 4 will inject ManagedAgentQueueService and enqueue the job here.
    throw new Error('Managed runtime queue not yet configured');
  }
}
