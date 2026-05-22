import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentMcpServerRepository, AgentRepository } from '@novu/dal';

import { ListAgentMcpServersResponseDto } from '../../dtos/mcp-server.dto';
import { toEnablementResponse } from '../enable-agent-mcp-server/enable-agent-mcp-server.usecase';
import { ListAgentMcpServersCommand } from './list-agent-mcp-servers.command';

@Injectable()
export class ListAgentMcpServers {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository
  ) {}

  async execute(command: ListAgentMcpServersCommand): Promise<ListAgentMcpServersResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const rows = await this.agentMcpServerRepository.findByAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
    });

    return { data: rows.map(toEnablementResponse) };
  }
}
