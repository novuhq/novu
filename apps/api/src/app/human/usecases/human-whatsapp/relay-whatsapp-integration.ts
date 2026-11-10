import type { AgentIntegrationRepository, AgentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

type RelayScope = { environmentId: string; organizationId: string; agentIdentifier: string };

/**
 * The relay agent and the WhatsApp Business integration linked to it, if any. `agent` is null before
 * `human setup` has made the relay; `integration` is null while no WhatsApp integration is linked.
 */
export async function findRelayWhatsAppIntegration(
  repositories: {
    agentRepository: AgentRepository;
    agentIntegrationRepository: AgentIntegrationRepository;
    integrationRepository: IntegrationRepository;
  },
  scope: RelayScope
): Promise<{ agent: { _id: string; identifier: string } | null; integration: IntegrationEntity | null }> {
  const agent = await repositories.agentRepository.findOne(
    { identifier: scope.agentIdentifier, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
    ['_id', 'identifier', 'runtime']
  );

  if (!agent || agent.runtime !== 'human_relay') {
    return { agent: null, integration: null };
  }

  const links = await repositories.agentIntegrationRepository.find(
    {
      _environmentId: scope.environmentId,
      _organizationId: scope.organizationId,
      _agentId: agent._id,
      disconnectedAt: null,
    },
    { _integrationId: 1 }
  );

  if (links.length === 0) {
    return { agent, integration: null };
  }

  const [integration] = await repositories.integrationRepository.find({
    _environmentId: scope.environmentId,
    _organizationId: scope.organizationId,
    _id: { $in: links.map((link) => link._integrationId) },
    providerId: ChatProviderIdEnum.WhatsAppBusiness,
  });

  return { agent, integration: integration ?? null };
}
