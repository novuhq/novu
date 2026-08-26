/**
 * Agents activation Mixpanel funnel (beginning of path). Identity is the acting
 * userId; `_organization` is attached for org-level filtering/breakdown.
 *
 * Create Organization → Agents Usecase Selected → Agent Created → Agent Assigned To Workflow → Workflow Origin Hydrated
 */
export const AGENTS_ORG_FUNNEL_EVENTS = {
  USECASE_SELECTED: 'Agents Usecase Selected - [Agents]',
  AGENT_CREATED: 'Agent Created - [Agents]',
  AGENT_ASSIGNED_TO_WORKFLOW: 'Agent Assigned To Workflow - [Agents]',
  WORKFLOW_ORIGIN_HYDRATED: 'Workflow Origin Hydrated - [Agents]',
} as const;

export type AgentsOrgFunnelEvent = (typeof AGENTS_ORG_FUNNEL_EVENTS)[keyof typeof AGENTS_ORG_FUNNEL_EVENTS];

export const AGENT_ANALYTICS_SOURCES = ['cli', 'dashboard_onboarding', 'dashboard', 'api'] as const;

export type AgentAnalyticsSource = (typeof AGENT_ANALYTICS_SOURCES)[number];

export const AGENTS_USECASE_SOURCES = ['usecase_picker', 'product_type_deeplink', 'cli'] as const;

export type AgentsUsecaseSource = (typeof AGENTS_USECASE_SOURCES)[number];

/** Request header used by dashboard/CLI to attribute Agent Created funnel source. */
export const NOVU_ANALYTICS_SOURCE_HEADER = 'Novu-Analytics-Source';

export function isAgentAnalyticsSource(value: unknown): value is AgentAnalyticsSource {
  return typeof value === 'string' && (AGENT_ANALYTICS_SOURCES as readonly string[]).includes(value);
}
