import { AGENTS_ORG_FUNNEL_EVENTS, type AgentsUsecaseSource } from '@novu/shared';
import { measure } from '@/api/telemetry';

/**
 * Agents funnel step 2. Exact Mixpanel event name (no `[DASHBOARD]` suffix) so UI
 * and CLI share one funnel. Identity is the authenticated user; `_organization`
 * is attached by the telemetry API for org filtering.
 */
export async function trackAgentsUsecaseSelected(source: AgentsUsecaseSource): Promise<void> {
  await measure(AGENTS_ORG_FUNNEL_EVENTS.USECASE_SELECTED, { source });
}
