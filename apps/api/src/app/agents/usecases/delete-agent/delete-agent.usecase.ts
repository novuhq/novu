import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository } from '@novu/dal';

import { trackAgentDeleted } from '../../agent-analytics';
import { CleanupNovuEmail } from '../cleanup-novu-email/cleanup-novu-email.usecase';
import { DeleteAgentCommand } from './delete-agent.command';

@Injectable()
export class DeleteAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly cleanupNovuEmail: CleanupNovuEmail,
    private readonly analyticsService: AnalyticsService
  ) {}

  async execute(command: DeleteAgentCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    await this.agentRepository.withTransaction(async (session) => {
      await this.cleanupNovuEmail.cleanupForAgent(agent._id, command.environmentId, command.organizationId, session);

      await this.agentIntegrationRepository.delete(
        {
          _agentId: agent._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );

      await this.agentRepository.delete(
        {
          _id: agent._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );
    });

    trackAgentDeleted(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.identifier,
    });
  }
}
