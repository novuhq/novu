import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';

import { ListAgentIntegrationsResponseDto } from '../../dtos/list-agent-integrations-response.dto';
import { toAgentIntegrationResponse } from '../../mappers/agent-response.mapper';
import { ListAgentIntegrationsCommand } from './list-agent-integrations.command';

@Injectable()
export class ListAgentIntegrations {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

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
      ['_id']
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
    let idToIdentifier = new Map<string, string>();

    if (integrationIds.length > 0) {
      const integrations = await this.integrationRepository.find(
        {
          _id: { $in: integrationIds },
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        '_id identifier'
      );

      idToIdentifier = new Map(integrations.map((i) => [i._id, i.identifier]));
    }

    return {
      data: pagination.links.map((link) =>
        toAgentIntegrationResponse(link, idToIdentifier.get(link._integrationId) ?? '')
      ),
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
