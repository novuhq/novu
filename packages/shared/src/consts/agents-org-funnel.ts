/**
 * Org-scoped Mixpanel activation funnel (distinct_id = organizationId):
 * Create Organization → Agents Usecase Selected → Agent Created → Agent First Inbound Message
 */
export const AGENTS_ORG_FUNNEL_EVENTS = {
  USECASE_SELECTED: 'Agents Usecase Selected - [Agents]',
  AGENT_CREATED: 'Agent Created - [Agents]',
  FIRST_INBOUND: 'Agent First Inbound Message - [Agents]',
  /** Legacy name; still dual-fired alongside FIRST_INBOUND for Mixpanel continuity. */
  FIRST_WEBHOOK_LEGACY: 'Agent Integration First Webhook - [Agents]',
} as const;

export type AgentsOrgFunnelEvent = (typeof AGENTS_ORG_FUNNEL_EVENTS)[keyof typeof AGENTS_ORG_FUNNEL_EVENTS];

export const AGENT_ANALYTICS_SOURCES = ['cli', 'dashboard_onboarding', 'dashboard', 'api'] as const;

export type AgentAnalyticsSource = (typeof AGENT_ANALYTICS_SOURCES)[number];

export const AGENTS_USECASE_SOURCES = ['usecase_picker', 'product_type_deeplink', 'cli'] as const;

export type AgentsUsecaseSource = (typeof AGENTS_USECASE_SOURCES)[number];

/** Request header used by dashboard/CLI to attribute Agent Created funnel source. */
export const NOVU_ANALYTICS_SOURCE_HEADER = 'novu-analytics-source';

export function isAgentAnalyticsSource(value: unknown): value is AgentAnalyticsSource {
  return typeof value === 'string' && (AGENT_ANALYTICS_SOURCES as readonly string[]).includes(value);
}
