import { AGENTS_ORG_FUNNEL_EVENTS, type AgentsUsecaseSource } from '@novu/shared';
import { measure } from '@/api/telemetry';

/**
 * Org-scoped Agents funnel step 2. Uses the exact Mixpanel event name (no
 * `[DASHBOARD]` suffix) so UI and CLI share one funnel with Create Organization /
 * Agent Created / First Inbound.
 */
export async function trackAgentsUsecaseSelected(source: AgentsUsecaseSource): Promise<void> {
  await measure(AGENTS_ORG_FUNNEL_EVENTS.USECASE_SELECTED, {
    source,
    analyticsIdentity: 'organization',
  });
}
