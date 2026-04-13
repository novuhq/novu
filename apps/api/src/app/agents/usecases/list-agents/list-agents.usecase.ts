import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { ListAgentsResponseDto } from '../../dtos/list-agents-response.dto';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { ListAgentsCommand } from './list-agents.command';

@Injectable()
export class ListAgents {
  constructor(private readonly agentRepository: AgentRepository) {}

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

    return {
      data: pagination.agents.map((agent) => toAgentResponse(agent)),
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
