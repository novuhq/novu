import { Injectable } from '@nestjs/common';
import { type IManagedAgentToolConfirmation, ManagedAgentQueueService, PinoLogger } from '@novu/application-generic';
import type { AgentExecutionParams } from './bridge-executor.service';

export interface ToolConfirmationExecutionContext {
  agentId: string;
  conversationId: string;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
  agentIdentifier: string;
  platform: string;
  platformThreadId: string;
  subscriberId?: string;
  subscriberFirstName?: string;
  toolConfirmation: IManagedAgentToolConfirmation;
}

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

  /**
   * Enqueue a follow-up turn that resumes the conversation's existing
   * managed-runtime session by approving (or denying) a previously surfaced
   * tool call. `messageText` is intentionally empty — the worker sends a
   * `user.tool_confirmation` event rather than a new user message.
   */
  async executeToolConfirmation(context: ToolConfirmationExecutionContext): Promise<void> {
    await this.managedAgentQueue.add({
      name: context.agentId,
      data: {
        agentId: context.agentId,
        conversationId: context.conversationId,
        environmentId: context.environmentId,
        organizationId: context.organizationId,
        integrationIdentifier: context.integrationIdentifier,
        agentIdentifier: context.agentIdentifier,
        platform: context.platform,
        messageText: '',
        subscriberId: context.subscriberId,
        subscriberFirstName: context.subscriberFirstName,
        platformThreadId: context.platformThreadId,
        toolConfirmation: context.toolConfirmation,
      },
    });

    this.logger.info(
      {
        agentId: context.agentId,
        conversationId: context.conversationId,
        toolUseId: context.toolConfirmation.toolUseId,
        approved: context.toolConfirmation.approved,
      },
      'Enqueued managed-agent tool-confirmation job'
    );
  }
}
