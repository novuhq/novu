import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { ListAgentsResponseDto } from '../../dtos/list-agents-response.dto';
import { loadAgentIntegrationSummariesForAgents } from '../../helpers/load-agent-integration-summaries.helper';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { ListAgentsCommand } from './list-agents.command';

@Injectable()
export class ListAgents {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ListAgentsCommand): Promise<ListAgentsResponseDto> {
    if (command.before && command.after) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const pagination = await this.agentRepository.listAgents({
      after: command.after,
      before: command.before,
      limit: command.limit,
      sortDirection: command.orderDirection === DirectionEnum.ASC ? 1 : -1,
      sortBy: command.orderBy,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      includeCursor: command.includeCursor,
      identifier: command.identifier,
    });

    const integrationsByAgentId = await loadAgentIntegrationSummariesForAgents(
      this.agentIntegrationRepository,
      this.integrationRepository,
      command.environmentId,
      command.organizationId,
      pagination.agents
    );

    return {
      data: pagination.agents.map((agent) => ({
        ...toAgentResponse(agent),
        integrations: integrationsByAgentId.get(agent._id) ?? [],
      })),
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
