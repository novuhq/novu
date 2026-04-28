import Anthropic from '@anthropic-ai/sdk';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, AgentRuntimeEnum } from '@novu/dal';
import { TestClaudeManagedAgentResponseDto } from '../../dtos/agent-runtime.dto';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { TestClaudeManagedAgentCommand } from './test-claude-managed-agent.command';

@Injectable()
export class TestClaudeManagedAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly credentialsService: AnthropicAgentCredentialsService
  ) {}

  async execute(command: TestClaudeManagedAgentCommand): Promise<TestClaudeManagedAgentResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    if ((agent.runtime ?? AgentRuntimeEnum.BRIDGE) !== AgentRuntimeEnum.CLAUDE_MANAGED || !agent.managedRuntime) {
      throw new BadRequestException('Agent is not configured for Claude Managed Agents.');
    }

    const apiKey = await this.credentialsService.getApiKey(command.organizationId, command.environmentId);
    const client = new Anthropic({ apiKey });
    const session = await client.beta.sessions.create({
      agent: { type: 'agent', id: agent.managedRuntime.agentId },
      environment_id: agent.managedRuntime.environmentId,
      vault_ids: agent.managedRuntime.vaultIds,
    });

    await client.beta.sessions.archive(session.id);

    return { success: true };
  }
}
