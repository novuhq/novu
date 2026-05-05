import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, AgentRuntimeEnum } from '@novu/dal';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { SubscriberAnthropicVaultService } from '../../services/subscriber-anthropic-vault.service';
import { DisconnectSubscriberMcpCommand } from './disconnect-subscriber-mcp.command';

@Injectable()
export class DisconnectSubscriberMcp {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly subscriberVaultService: SubscriberAnthropicVaultService
  ) {}

  async execute(command: DisconnectSubscriberMcpCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'runtime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }
    if ((agent.runtime ?? AgentRuntimeEnum.BRIDGE) !== AgentRuntimeEnum.CLAUDE_MANAGED) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" does not use Claude Managed runtime.`);
    }

    const apiKey = await this.credentialsService.getApiKey(command.organizationId, command.environmentId);

    await this.subscriberVaultService.removeConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      agentId: agent._id,
      apiKey,
      mcpServerName: command.mcpServerName,
    });
  }
}
