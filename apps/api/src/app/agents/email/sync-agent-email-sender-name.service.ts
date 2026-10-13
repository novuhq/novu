import { Injectable } from '@nestjs/common';
import { AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_INBOX_PROVIDER_IDS } from '@novu/shared';
import type { ClientSession } from 'mongoose';

/**
 * An agent's Novu Email integrations keep their own copy of the sender name. This brings that copy in
 * line after the agent is renamed, so its emails come from the new name.
 */
@Injectable()
export class SyncAgentEmailSenderName {
  constructor(
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(
    agent: { agentId: string; environmentId: string; organizationId: string },
    senderName: string,
    session: ClientSession | null = null
  ): Promise<void> {
    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agent.agentId,
        _environmentId: agent.environmentId,
        _organizationId: agent.organizationId,
      },
      ['_integrationId'],
      { session }
    );

    const integrationIds = links.map((link) => link._integrationId).filter(Boolean);
    if (integrationIds.length === 0) {
      return;
    }

    await this.integrationRepository.update(
      {
        _id: { $in: integrationIds },
        _environmentId: agent.environmentId,
        _organizationId: agent.organizationId,
        providerId: { $in: [...AGENT_INBOX_PROVIDER_IDS] },
      },
      { $set: { 'credentials.senderName': senderName } },
      session ? { session } : {}
    );
  }
}
