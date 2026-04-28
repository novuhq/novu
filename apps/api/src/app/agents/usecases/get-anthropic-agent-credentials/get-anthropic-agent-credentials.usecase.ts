import { Injectable } from '@nestjs/common';
import { AgentCredentialsResponseDto } from '../../dtos/agent-runtime.dto';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { GetAnthropicAgentCredentialsCommand } from './get-anthropic-agent-credentials.command';

@Injectable()
export class GetAnthropicAgentCredentials {
  constructor(private readonly credentialsService: AnthropicAgentCredentialsService) {}

  async execute(command: GetAnthropicAgentCredentialsCommand): Promise<AgentCredentialsResponseDto> {
    return {
      configured: await this.credentialsService.isConfigured(command.organizationId, command.environmentId),
    };
  }
}
