import { NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';

export interface ResolvedAgentIntegrationWebhook {
  agent: { _id: string; identifier: string };
  integration: IntegrationEntity;
  callbackUrl: string;
}

function buildAgentWebhookUrl(agentId: string, integrationIdentifier: string): string {
  // Prefer `AGENT_API_HOSTNAME` (a publicly reachable HTTPS host chat platforms can call back
  // to — typically a tunnel URL in dev) and fall back to the standard `API_ROOT_URL`.
  const base = (process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL ?? '').replace(/\/$/, '');

  if (!base) {
    throw new Error(
      `buildAgentWebhookUrl: neither AGENT_API_HOSTNAME nor API_ROOT_URL is configured (agentId="${agentId}", integrationIdentifier="${integrationIdentifier}")`
    );
  }

  return `${base}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

/**
 * Shared prefix for every channel's "configure webhook" usecase: resolves the
 * agent and integration, verifies the integration is the expected provider and
 * is actually linked to the agent, and builds the callback URL. Each channel's
 * own webhook-registration call (Meta OAuth, Sendblue SDK, etc.) starts from
 * the result of this helper — that provider-specific logic is different enough
 * per channel that it stays in each usecase rather than being templated here.
 */
export async function resolveAgentIntegrationForWebhook(params: {
  agentRepository: AgentRepository;
  integrationRepository: IntegrationRepository;
  agentIntegrationRepository: AgentIntegrationRepository;
  agentIdentifier: string;
  integrationIdentifier: string;
  environmentId: string;
  organizationId: string;
  providerId: string;
  providerLabel: string;
}): Promise<ResolvedAgentIntegrationWebhook> {
  const {
    agentRepository,
    integrationRepository,
    agentIntegrationRepository,
    agentIdentifier,
    integrationIdentifier,
    environmentId,
    organizationId,
    providerId,
    providerLabel,
  } = params;

  const agent = await agentRepository.findOne(
    { identifier: agentIdentifier, _environmentId: environmentId, _organizationId: organizationId },
    ['_id', 'identifier']
  );

  if (!agent) {
    throw new NotFoundException(`Agent with identifier "${agentIdentifier}" was not found.`);
  }

  const integration = await integrationRepository.findOne({
    _environmentId: environmentId,
    _organizationId: organizationId,
    identifier: integrationIdentifier,
  });

  if (!integration) {
    throw new NotFoundException(`Integration with identifier "${integrationIdentifier}" was not found.`);
  }

  if (integration.providerId !== providerId) {
    throw new NotFoundException(`Integration "${integrationIdentifier}" is not a ${providerLabel} integration.`);
  }

  // Authorization: ensure the integration is actually linked to this agent before exposing
  // webhook configuration on it. Without this check an `AGENT_WRITE` caller could rebind
  // webhooks for an unrelated integration of the same provider in the same tenant.
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

  return { agent, integration, callbackUrl: buildAgentWebhookUrl(agent._id, integration.identifier) };
}
