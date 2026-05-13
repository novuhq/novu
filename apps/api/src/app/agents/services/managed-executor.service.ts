import { Injectable } from '@nestjs/common';
import { ManagedAgentQueueService, PinoLogger } from '@novu/application-generic';
import type { AgentExecutionParams } from './bridge-executor.service';

@Injectable()
export class ManagedExecutorService {
  constructor(
    private readonly managedAgentQueue: ManagedAgentQueueService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(context: AgentExecutionParams, agent: { _id: string }): Promise<void> {
    await this.managedAgentQueue.add({
      name: String(agent._id),
      data: {
        agentId: String(agent._id),
        conversationId: String(context.conversation._id),
        environmentId: context.config.environmentId,
        organizationId: context.config.organizationId,
        integrationIdentifier: context.config.integrationIdentifier,
        agentIdentifier: context.config.agentIdentifier,
        platform: context.config.platform,
        messageText: context.message?.text ?? '',
        subscriberId: context.subscriber?.subscriberId,
        subscriberFirstName: context.subscriber?.firstName ?? undefined,
        platformThreadId: context.platformContext.threadId,
      },
    });

    this.logger.info(`Enqueued managed agent job for agent ${agent._id}, conversation ${context.conversation._id}`);
  }
}
