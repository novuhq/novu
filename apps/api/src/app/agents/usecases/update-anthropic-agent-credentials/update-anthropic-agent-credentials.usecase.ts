import { Injectable } from '@nestjs/common';
import { AgentCredentialsResponseDto } from '../../dtos/agent-runtime.dto';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { UpdateAnthropicAgentCredentialsCommand } from './update-anthropic-agent-credentials.command';

@Injectable()
export class UpdateAnthropicAgentCredentials {
  constructor(private readonly credentialsService: AnthropicAgentCredentialsService) {}

  async execute(command: UpdateAnthropicAgentCredentialsCommand): Promise<AgentCredentialsResponseDto> {
    await this.credentialsService.upsertApiKey({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      userId: command.userId,
      apiKey: command.apiKey,
    });

    return { configured: true };
  }
}
