import { ChatProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink } from '@/api/agents';

/** Whether a real inbound message has landed (API stamped `connectedAt`). */
export function hasAgentInboundConnection(connectedAt: string | null | undefined): boolean {
  if (!connectedAt) {
    return false;
  }

  const timestampMs = new Date(connectedAt).getTime();

  return !Number.isNaN(timestampMs) && timestampMs > 0;
}

/** Whether an agent–integration link should be presented as "Connected" in the dashboard. */
export function isAgentIntegrationConnected(link: Pick<AgentIntegrationLink, 'connectedAt'>): boolean {
  return hasAgentInboundConnection(link.connectedAt);
}

export function getWebChatIntegrationLink<T extends { integration: { providerId: string; identifier: string } }>(
  links: T[] | undefined
): T | undefined {
  return links?.find((link) => link.integration.providerId === ChatProviderIdEnum.NovuWebChat);
}

export function getWebChatIntegrationIdentifier(
  links: Array<{ integration: { providerId: string; identifier: string } }> | undefined
): string | undefined {
  return getWebChatIntegrationLink(links)?.integration.identifier;
}
