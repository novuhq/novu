import type { AgentIntegrationLink } from '@/api/agents';

/** Whether a real inbound message has landed (API stamped `connectedAt`). */
export function hasAgentInboundConnection(connectedAt: string | null | undefined): boolean {
  if (!connectedAt) {
    return false;
  }

  const timestampMs = new Date(connectedAt).getTime();

  return !Number.isNaN(timestampMs) && timestampMs > 0;
}

/**
 * Returns whether an agent–integration link should be presented as "Connected"
 * in the dashboard: `connectedAt` is stamped by the API the first time an
 * inbound webhook delivers a real message. This applies uniformly to every
 * provider — the Novu Email link is only created when the user clicks Connect,
 * so like a chat channel it stays "in setup" until the first inbound email.
 */
export function isAgentIntegrationConnected(link: Pick<AgentIntegrationLink, 'connectedAt' | 'integration'>): boolean {
  return hasAgentInboundConnection(link.connectedAt);
}
