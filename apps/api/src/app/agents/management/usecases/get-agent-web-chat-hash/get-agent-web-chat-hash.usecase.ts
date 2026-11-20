import { Injectable } from '@nestjs/common';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { createDashboardWebChatAgentHash } from '../../../web-chat/web-chat-agent-hash';
import { GetAgentWebChatHashCommand } from './get-agent-web-chat-hash.command';

export interface AgentWebChatHashResponseDto {
  agentHash: string;
}

@Injectable()
export class GetAgentWebChatHash {
  constructor(private readonly getDecryptedSecretKey: GetDecryptedSecretKey) {}

  async execute(command: GetAgentWebChatHashCommand): Promise<AgentWebChatHashResponseDto> {
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );

    return { agentHash: createDashboardWebChatAgentHash(secretKey, command.identifier) };
  }
}
