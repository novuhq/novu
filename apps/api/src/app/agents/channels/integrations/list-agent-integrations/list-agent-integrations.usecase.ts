import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentEntitlementsService,
  InstrumentUsecase,
  isChannelOverPlanLimit,
  PinoLogger,
} from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { DirectionEnum, EmailProviderIdEnum } from '@novu/shared';

import { ListAgentIntegrationsResponseDto } from '../../../shared/dtos/list-agent-integrations-response.dto';
import { toAgentIntegrationResponse } from '../../../shared/mappers/agent-response.mapper';
import { ListAgentIntegrationsCommand } from './list-agent-integrations.command';

@Injectable()
export class ListAgentIntegrations {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentEntitlementsService: AgentEntitlementsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ListAgentIntegrationsCommand): Promise<ListAgentIntegrationsResponseDto> {
    if (command.before && command.after) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'identifier', 'name']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    let filterIntegrationId: string | undefined;

    if (command.integrationIdentifier) {
      const filterIntegration = await this.integrationRepository.findOne(
        {
          identifier: command.integrationIdentifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        ['_id']
      );

      if (!filterIntegration) {
        return {
          data: [],
          next: null,
          previous: null,
          totalCount: 0,
          totalCountCapped: false,
        };
      }

      filterIntegrationId = filterIntegration._id;
    }

    const pagination = await this.agentIntegrationRepository.listAgentIntegrationsForAgent({
      after: command.after,
      before: command.before,
      limit: command.limit,
      sortDirection: command.orderDirection === DirectionEnum.ASC ? 1 : -1,
      sortBy: command.orderBy,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      includeCursor: command.includeCursor,
      integrationId: filterIntegrationId,
    });

    const integrationIds = [...new Set(pagination.links.map((link) => link._integrationId))];
    type IntegrationSummary = Pick<
      IntegrationEntity,
      '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'
    > &
      Partial<Pick<IntegrationEntity, 'credentials'>>;
    let idToIntegration = new Map<string, IntegrationSummary>();

    if (integrationIds.length > 0) {
      // We include `credentials` because the NovuAgent integration mapper reads
      // `emailSlugPrefix` to derive the shared-inbox address. Non-NovuAgent
      // providers don't use it and the field is plaintext (no decryption).
      const integrations = await this.integrationRepository.find(
        {
          _id: { $in: integrationIds },
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        '_id identifier name providerId channel active credentials'
      );

      idToIntegration = new Map(
        integrations.map((i) => [
          i._id,
          {
            _id: i._id,
            identifier: i.identifier,
            name: i.name,
            providerId: i.providerId,
            channel: i.channel,
            active: i.active,
            credentials: i.providerId === EmailProviderIdEnum.NovuAgent ? i.credentials : undefined,
          } satisfies IntegrationSummary,
        ])
      );
    }

    const channelUsage = await this.agentEntitlementsService.getChannelPlanUsage(
      command.organizationId,
      command.environmentId
    );

    const data = pagination.links.reduce<ListAgentIntegrationsResponseDto['data']>((acc, link) => {
      const integration = idToIntegration.get(link._integrationId);

      if (!integration) {
        this.logger.warn(
          { agentIntegrationLinkId: link._id, integrationId: link._integrationId },
          'Skipping agent-integration link whose integration no longer exists'
        );

        return acc;
      }

      const exceedsPlanLimit = isChannelOverPlanLimit(channelUsage, {
        providerId: integration.providerId,
      });

      acc.push({
        ...toAgentIntegrationResponse(link, integration, agent),
        // `undefined` drops at JSON serialization, keeping the flag presence-only.
        exceedsPlanLimit: exceedsPlanLimit || undefined,
      });

      return acc;
    }, []);

    return {
      data,
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
      planUsage: { used: channelUsage.used, limit: channelUsage.limit },
    };
  }
}
