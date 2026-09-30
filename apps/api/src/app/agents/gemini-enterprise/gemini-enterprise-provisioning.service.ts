import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { decryptCredentials, encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import shortid from 'shortid';
import { resolveAgentIntegrationForWebhook } from '../channels/shared/resolve-agent-integration-webhook.util';
import type { AgentIntegrationResponseDto } from '../shared/dtos';
import { toAgentIntegrationResponse } from '../shared/mappers/agent-response.mapper';
import { agentCard } from './a2a-mapping';

const PROVIDER_LABEL = 'Gemini Enterprise';

export function buildGeminiEnterpriseEndpointUrl(agentId: string, integrationIdentifier: string, secret: string) {
  const base = (process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL ?? '').replace(/\/$/, '');

  return `${base}/v1/agents/${agentId}/gemini-enterprise/${integrationIdentifier}/${secret}`;
}

/**
 * One Gemini Enterprise integration per agent. The endpoint secret lives encrypted in
 * `credentials.token` and is part of the A2A endpoint URL, the only credential GE can carry.
 */
@Injectable()
export class GeminiEnterpriseProvisioningService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async findOrCreate(
    agent: { _id: string; identifier: string; name: string },
    environmentId: string,
    organizationId: string
  ): Promise<AgentIntegrationResponseDto> {
    const links = await this.agentIntegrationRepository.find(
      { _agentId: agent._id, _environmentId: environmentId, _organizationId: organizationId },
      '*'
    );
    const existing = links.length
      ? await this.integrationRepository.findOne(
          {
            _id: { $in: links.map((link) => link._integrationId) },
            _environmentId: environmentId,
            _organizationId: organizationId,
            providerId: ChatProviderIdEnum.GeminiEnterprise,
          },
          '_id identifier name providerId channel active'
        )
      : null;
    const existingLink = existing && links.find((link) => link._integrationId === existing._id);

    if (existing && existingLink) {
      return toAgentIntegrationResponse(existingLink, existing, agent);
    }

    const integration = await this.integrationRepository.create({
      providerId: ChatProviderIdEnum.GeminiEnterprise,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ token: randomBytes(24).toString('hex') }),
      configurations: {},
      name: PROVIDER_LABEL,
      identifier: `gemini-enterprise-${shortid.generate()}`,
      active: true,
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
    const link = await this.agentIntegrationRepository.createOrReviveLink({
      agentId: agent._id,
      integrationId: integration._id,
      environmentId,
      organizationId,
    });

    return toAgentIntegrationResponse(link, integration, agent);
  }

  /** The JSON an admin pastes when registering the agent in Gemini Enterprise. */
  async getAgentCard(params: {
    agentIdentifier: string;
    integrationIdentifier: string;
    environmentId: string;
    organizationId: string;
  }) {
    const { agent, integration } = await resolveAgentIntegrationForWebhook({
      agentRepository: this.agentRepository,
      integrationRepository: this.integrationRepository,
      agentIntegrationRepository: this.agentIntegrationRepository,
      ...params,
      providerId: ChatProviderIdEnum.GeminiEnterprise,
      providerLabel: PROVIDER_LABEL,
    });
    const secret = decryptCredentials(integration.credentials).token ?? '';

    return agentCard({
      url: buildGeminiEnterpriseEndpointUrl(agent._id, integration.identifier, secret),
      name: agent.name,
      description: agent.description || `${agent.name}, powered by Novu`,
    });
  }
}
