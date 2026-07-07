import type { AgentIntegrationLink } from '@/api/agents';
import { hasAgentInboundConnection } from './is-agent-integration-connected';

type IsChannelReadyForBridgeParams = {
  selectedProviderId: string | undefined;
  selectedIntegrationId: string | undefined;
  agentIntegrationLinks: AgentIntegrationLink[];
};

export function isChannelReadyForBridge({
  selectedProviderId,
  selectedIntegrationId,
  agentIntegrationLinks,
}: IsChannelReadyForBridgeParams): boolean {
  if (!selectedProviderId || !selectedIntegrationId) {
    return false;
  }

  return agentIntegrationLinks.some(
    (link) => link.integration._id === selectedIntegrationId && hasAgentInboundConnection(link.connectedAt)
  );
}
