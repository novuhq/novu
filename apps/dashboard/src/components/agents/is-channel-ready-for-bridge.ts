import { EmailProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink } from '@/api/agents';
import { isAgentIntegrationConnected } from './is-agent-integration-connected';

type IsChannelReadyForBridgeParams = {
  selectedProviderId: string | undefined;
  selectedIntegrationId: string | undefined;
  agentIntegrationLinks: AgentIntegrationLink[];
  /** Cloud agents with an auto-provisioned shared inbox use the email-card selection path. */
  useCloudMergedListenStep: boolean;
};

/**
 * Returns whether the user has completed channel setup enough to surface bridge
 * handler steps for custom-code agents.
 */
export function isChannelReadyForBridge({
  selectedProviderId,
  selectedIntegrationId,
  agentIntegrationLinks,
  useCloudMergedListenStep,
}: IsChannelReadyForBridgeParams): boolean {
  if (!selectedProviderId || !selectedIntegrationId) {
    return false;
  }

  if (useCloudMergedListenStep && selectedProviderId === EmailProviderIdEnum.NovuAgent) {
    const novuLink = agentIntegrationLinks.find(
      (link) =>
        link.integration.providerId === EmailProviderIdEnum.NovuAgent &&
        link.integration._id === selectedIntegrationId
    );

    return Boolean(novuLink && isAgentIntegrationConnected(novuLink));
  }

  return agentIntegrationLinks.some(
    (link) =>
      link.integration._id === selectedIntegrationId &&
      link.integration.providerId !== EmailProviderIdEnum.NovuAgent &&
      Boolean(link.connectedAt)
  );
}
