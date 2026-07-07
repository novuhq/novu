import type { AgentIntegrationLink } from '@/api/agents';
import { hasAgentInboundConnection } from '@/components/agents/is-agent-integration-connected';

/** How long after connection the "What's next" guide stays visible on revisit. */
export const WHATS_NEXT_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * Best-effort timestamp for when the user "connected" this integration — used to decide whether
 * the post-connect "What's next" guide is still relevant.
 */
export function resolveWhatsNextConnectionAt(link: Pick<AgentIntegrationLink, 'connectedAt'>): string | null {
  if (hasAgentInboundConnection(link.connectedAt)) {
    return link.connectedAt ?? null;
  }

  return null;
}

export function isWithinWhatsNextGracePeriod(
  connectionAt: string | null,
  gracePeriodMs = WHATS_NEXT_GRACE_PERIOD_MS
): boolean {
  if (!connectionAt) {
    return true;
  }

  const timestampMs = new Date(connectionAt).getTime();

  if (Number.isNaN(timestampMs)) {
    return true;
  }

  return Date.now() - timestampMs < gracePeriodMs;
}

export function shouldShowWhatsNextGuide(
  completedAt: string | null,
  options: { isFreshSession?: boolean } = {}
): boolean {
  if (options.isFreshSession) {
    return true;
  }

  return isWithinWhatsNextGracePeriod(completedAt);
}

export function shouldShowAgentWhatsNextSection(
  links: ReadonlyArray<Pick<AgentIntegrationLink, 'connectedAt'>>,
  options: { isFreshSession?: boolean } = {}
): boolean {
  if (options.isFreshSession) {
    return true;
  }

  return links.some((link) => isWithinWhatsNextGracePeriod(resolveWhatsNextConnectionAt(link)));
}
