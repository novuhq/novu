import { NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

export interface ResolvedWhatsAppAgentIntegration {
  agent: { _id: string; identifier: string; name: string };
  integration: IntegrationEntity;
}

/**
 * Shared validation for the WhatsApp Embedded Signup flows: resolves the
 * WhatsApp Business integration and agent by identifier within the given
 * env/org, and verifies the integration is actually linked to the agent.
 */
export async function resolveWhatsAppAgentIntegration(params: {
  agentRepository: AgentRepository;
  integrationRepository: IntegrationRepository;
  agentIntegrationRepository: AgentIntegrationRepository;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
}): Promise<ResolvedWhatsAppAgentIntegration> {
  const {
    agentRepository,
    integrationRepository,
    agentIntegrationRepository,
    environmentId,
    organizationId,
    agentIdentifier,
    integrationIdentifier,
  } = params;

  const integration = await integrationRepository.findOne({
    _environmentId: environmentId,
    _organizationId: organizationId,
    identifier: integrationIdentifier,
  });

  if (!integration) {
    throw new NotFoundException(`Integration with identifier "${integrationIdentifier}" was not found.`);
  }

  if (integration.providerId !== ChatProviderIdEnum.WhatsAppBusiness) {
    throw new NotFoundException(`Integration "${integrationIdentifier}" is not a WhatsApp Business integration.`);
  }

  const agent = await agentRepository.findOne(
    {
      identifier: agentIdentifier,
      _environmentId: environmentId,
      _organizationId: organizationId,
    },
    ['_id', 'identifier', 'name']
  );

  if (!agent) {
    throw new NotFoundException(`Agent with identifier "${agentIdentifier}" was not found.`);
  }

  const agentIntegrationLink = await agentIntegrationRepository.findOne(
    {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _agentId: agent._id,
      _integrationId: integration._id,
    },
    ['_id']
  );

  if (!agentIntegrationLink) {
    throw new NotFoundException(`Integration "${integrationIdentifier}" is not linked to agent "${agentIdentifier}".`);
  }

  return { agent, integration };
}
