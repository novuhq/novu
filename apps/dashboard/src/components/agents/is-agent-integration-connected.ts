import { EmailProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink } from '@/api/agents';

function hasMeaningfulConnectedAt(connectedAt: string | null | undefined): boolean {
  if (!connectedAt) {
    return false;
  }

  const timestampMs = new Date(connectedAt).getTime();

  return !Number.isNaN(timestampMs) && timestampMs > 0;
}

/**
 * Returns whether an agent–integration link should be presented as "Connected"
 * in the dashboard.
 *
 * For most providers this is driven by `connectedAt`, which the API stamps the
 * first time an inbound webhook delivers a real message. The Novu Email
 * integration (`EmailProviderIdEnum.NovuAgent`) is auto-provisioned for every
 * new agent — its shared inbox is ready to receive mail the moment the link is
 * created, so we treat the link itself as the "connected" marker rather than
 * waiting for the first inbound message to flip `connectedAt`. That avoids
 * showing an "Action needed" / "Test connection" wizard on a freshly created
 * agent that already has a working shared inbox.
 */
export function isAgentIntegrationConnected(link: Pick<AgentIntegrationLink, 'connectedAt' | 'integration'>): boolean {
  if (hasMeaningfulConnectedAt(link.connectedAt)) return true;

  return link.integration.providerId === EmailProviderIdEnum.NovuAgent;
}

/**
 * User-configured channels only. Excludes the auto-provisioned Novu Email
 * integration so setup/onboarding flows stay aligned with managed-agent state.
 */
export function isUserFacingConnectedAgentIntegration(
  link: Pick<AgentIntegrationLink, 'connectedAt' | 'integration'>
): boolean {
  return hasMeaningfulConnectedAt(link.connectedAt) && link.integration.providerId !== EmailProviderIdEnum.NovuAgent;
}
