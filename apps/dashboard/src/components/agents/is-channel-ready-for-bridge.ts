import type { AgentIntegrationLink } from '@/api/agents';
import { hasAgentInboundConnection } from './is-agent-integration-connected';

type IsChannelReadyForBridgeParams = {
  selectedIntegrationId: string | undefined;
  agentIntegrationLinks: AgentIntegrationLink[];
};

export function isChannelReadyForBridge({
  selectedIntegrationId,
  agentIntegrationLinks,
}: IsChannelReadyForBridgeParams): boolean {
  if (!selectedIntegrationId) {
    return false;
  }

  return agentIntegrationLinks.some(
    (link) => link.integration._id === selectedIntegrationId && hasAgentInboundConnection(link.connectedAt)
  );
}
