import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, DomainRepository, IntegrationRepository } from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';
import { ClientSession } from 'mongoose';

import { RemoveAgentIntegrationCommand } from './remove-agent-integration.command';

@Injectable()
export class RemoveAgentIntegration {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly domainRepository: DomainRepository,
    private readonly logger: PinoLogger
  ) {}

  async execute(command: RemoveAgentIntegrationCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    await this.agentIntegrationRepository.withTransaction(async (session) => {
      const deleted = await this.agentIntegrationRepository.findOneAndDelete(
        {
          _id: command.agentIntegrationId,
          _agentId: agent._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );

      if (!deleted) {
        throw new NotFoundException(
          `Agent-integration link "${command.agentIntegrationId}" was not found for this agent.`
        );
      }

      await this.cleanupIfNovuEmail(agent._id, deleted._integrationId, command, session);
    });
  }

  private async cleanupIfNovuEmail(
    agentId: string,
    integrationId: string,
    command: RemoveAgentIntegrationCommand,
    session: ClientSession | null
  ): Promise<void> {
    const integration = await this.integrationRepository.findOne(
      {
        _id: integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id',
      { session }
    );

    if (!integration) return;

    await this.domainRepository.removeRoutesByDestination(command.environmentId, command.organizationId, agentId, {
      session,
    });

    await this.integrationRepository.delete(
      {
        _id: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { session }
    );

    this.logger.info({ agentId, integrationId: integration._id }, 'Cleaned up NovuAgent integration and domain routes');
  }
}
