import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { ListAgentIntegrationsResponseDto } from '../../dtos/list-agent-integrations-response.dto';
import { toAgentIntegrationResponse } from '../../mappers/agent-response.mapper';
import { ListAgentIntegrationsCommand } from './list-agent-integrations.command';

@Injectable()
export class ListAgentIntegrations {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
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
      integrationId: command.integrationId,
    });

    return {
      data: pagination.links.map((link) => toAgentIntegrationResponse(link)),
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
