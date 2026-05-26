import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, isAgentSharedInboxEnabled } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, DomainRouteRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, DomainRouteTypeEnum, EmailProviderIdEnum } from '@novu/shared';

import type { AgentIntegrationResponseDto } from '../../dtos';
import { toAgentIntegrationResponse } from '../../mappers/agent-response.mapper';
import { UpdateAgentInboxSharedCommand } from './update-agent-inbox-shared.command';

/**
 * Toggle the Novu shared inbox on/off for a single agent. Disabling is the
 * "replaceShared" semantic the dashboard reaches for once a custom-domain
 * inbox is configured — the worker then drops mail addressed to this agent on
 * `agentconnect.sh`. We refuse to disable when no custom address is configured
 * (would leave the agent with zero inbound paths).
 */
@Injectable()
export class UpdateAgentInboxShared {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly domainRouteRepository: DomainRouteRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdateAgentInboxSharedCommand): Promise<AgentIntegrationResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );
    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const { integration, link } = await this.loadNovuAgentIntegration(
      agent._id,
      command.environmentId,
      command.organizationId
    );

    if (command.disabled && !isAgentSharedInboxEnabled()) {
      throw new BadRequestException('Shared inbox feature is not enabled on this deployment.');
    }

    if (command.disabled) {
      const customCount = await this.domainRouteRepository.count({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        type: DomainRouteTypeEnum.AGENT,
        destination: agent._id,
      });
      if (customCount === 0) {
        throw new BadRequestException(
          'Cannot disable the shared inbox: add at least one custom-domain inbox first so the agent still receives mail.'
        );
      }
    }

    await this.integrationRepository.update(
      {
        _id: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: { 'credentials.sharedInboxDisabled': command.disabled } }
    );

    const refreshed = await this.integrationRepository.findOne({
      _id: integration._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!refreshed) {
      throw new NotFoundException('No Novu Email integration found for this agent.');
    }

    return toAgentIntegrationResponse(link, refreshed, {
      _id: agent._id,
      identifier: agent.identifier,
      name: agent.name,
    });
  }

  private async loadNovuAgentIntegration(agentId: string, environmentId: string, organizationId: string) {
    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agentId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      '*'
    );
    if (links.length === 0) {
      throw new NotFoundException('No Novu Email integration linked to this agent.');
    }

    const integrationIds = links.map((l) => l._integrationId);
    const integration = await this.integrationRepository.findOne({
      _id: { $in: integrationIds } as unknown as string,
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: EmailProviderIdEnum.NovuAgent,
      channel: ChannelTypeEnum.EMAIL,
    });
    if (!integration) {
      throw new NotFoundException('No Novu Email integration found for this agent.');
    }

    const link = links.find((l) => l._integrationId === integration._id);
    if (!link) {
      throw new NotFoundException('Agent–integration link not found.');
    }

    return { integration, link };
  }
}
