import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, DomainRepository, IntegrationRepository } from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';
import { ClientSession } from 'mongoose';

import { DeleteAgentCommand } from './delete-agent.command';

const LOG_CONTEXT = 'DeleteAgent';

@Injectable()
export class DeleteAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly domainRepository: DomainRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
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
      await this.cleanupEmailResources(agent._id, command, session);

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
  }

  private async cleanupEmailResources(
    agentId: string,
    command: DeleteAgentCommand,
    session: ClientSession | null
  ): Promise<void> {
    await this.domainRepository.removeRoutesByDestination(command.environmentId, command.organizationId, agentId, {
      session,
    });

    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_integrationId'],
      { session }
    );

    const integrationIds = links.map((l) => l._integrationId).filter(Boolean);
    if (integrationIds.length === 0) return;

    const novuEmailIntegrations = await this.integrationRepository.find(
      {
        _id: { $in: integrationIds },
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id',
      { session }
    );

    for (const integration of novuEmailIntegrations) {
      await this.integrationRepository.delete(
        {
          _id: integration._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );
      this.logger.info(
        { agentId, integrationId: integration._id },
        'Deleted orphaned NovuAgent integration',
        LOG_CONTEXT
      );
    }
  }
}
