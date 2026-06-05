import { AgentRuntimeProviderIdEnum } from '@novu/shared';

export type RuntimeType = 'scratch' | 'claude' | 'vertex';

export type CreateAgentMode = 'create' | 'existing';

/**
 * Normalized MCP server reference for a template pill. `iconUrl` is set when the icon comes from a
 * remote source (e.g. Sanity); otherwise the pill falls back to the local `McpIcon` keyed by `id`.
 */
export type McpServerPreview = {
  id: string;
  name?: string;
  iconUrl?: string;
};

export type AgentTemplate = {
  /** Stable identifier used to match an incoming `agentTemplateId` (Sanity `id.current`). */
  templateId?: string;
  label: string;
  name: string;
  instructions: string;
  /** MCP server ids (e.g. `sentry`, `datadog`). Drives the pill icons via the local `McpIcon`. */
  suggestedMcpServers: string[];
  /** Richer MCP server data (with remote icon URLs) used by the pills when available. */
  mcpServers?: McpServerPreview[];
};

export function findAgentTemplateById(
  templates: AgentTemplate[],
  id: string | undefined | null
): AgentTemplate | undefined {
  if (!id) {
    return undefined;
  }

  return templates.find((template) => template.templateId === id);
}

export type CreateAgentForm = {
  name: string;
  identifier: string;
  description: string;
  instructions: string;
  apiKey: string;
  runtime: RuntimeType;
  isExistingMode: boolean;
  providerId?: AgentRuntimeProviderIdEnum;
  externalAgentId?: string;
  externalEnvironmentId?: string;
  /**
   * Optional Anthropic workspace id. Empty/omitted means "use the default workspace".
   * For AWS Claude Platform this is required (`wrkspc_…`).
   */
  externalWorkspaceId?: string;
  region?: string;
  /**
   * Existing managed-runtime integration to attach the agent to. When present, `apiKey` is ignored
   * and a new integration is NOT created.
   */
  integrationId?: string;
  /**
   * Display name used when creating a brand-new managed-runtime integration. Only consumed when
   * `integrationId` is absent. Defaults to e.g. "Anthropic 1" in the dialog.
   */
  integrationName?: string;
  /**
   * Precomputed managed-runtime config (used by the AI "Generate from prompt" flow). When provided,
   * these values override the default tools list and any instructions-derived system prompt.
   */
  managedOverrides?: ManagedAgentRuntimeOverrides;
};

export type ManagedAgentRuntimeOverrides = {
  systemPrompt?: string;
  tools?: string[];
  mcpServers?: string[];
  skills?: Array<{ skillId: string }>;
};

export type CreateAgentFormErrors = {
  name?: string;
  identifier?: string;
  apiKey?: string;
  region?: string;
  externalWorkspaceId?: string;
  externalAgentId?: string;
  externalEnvironmentId?: string;
  integrationName?: string;
};

export const DEFAULT_CLAUDE_WORKSPACE_ID = 'default';

export const ANTHROPIC_API_KEY_HREF = 'https://console.anthropic.com/settings/keys';
export const CLAUDE_AGENT_ID_HREF = 'https://docs.claude.com/en/api/agents-list';
export const CLAUDE_ENVIRONMENT_ID_HREF = 'https://docs.claude.com/en/api/agents-list';
export const CLAUDE_WORKSPACE_HREF = 'https://console.anthropic.com/settings/workspaces';
export const AWS_CLAUDE_SETUP_HREF = 'https://docs.aws.amazon.com/claude-platform/latest/userguide/setup.html';
export const AWS_CLAUDE_API_KEYS_HREF =
  'https://docs.aws.amazon.com/claude-platform/latest/userguide/authentication.html';

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    templateId: 'incident-triage',
    label: 'Incident Triage',
    name: 'Incident Triage Agent',
    instructions: `You are an on-call engineer. When the user asks about production issues or error spikes:

1. GATHER ERRORS: Use the Sentry MCP to pull unresolved issues, recent regressions, and error frequency for the requested service, release, or time window. Include stack traces, first/last seen, affected user count, and release tags.

2. GATHER CONTEXT: Use the Datadog MCP to pull related logs, traces, and metric anomalies around the same timeframe. Correlate error spikes with deploys, traffic changes, or dependency failures.

3. TRIAGE: Group issues by root cause (code regression, config change, upstream outage, capacity). Rank by user impact × error volume. Flag issues that are new since the last deploy.

4. REPORT: Present findings as:
### Situation summary
- [Service] — [error rate or count] ([+/-]% vs baseline), likely started at [time]

### Top issues
- [Issue] — [count] events, [users] affected, first seen [time]. Likely cause: [hypothesis]. Next step: [specific action].

### Correlated signals
- Logs, traces, or metrics that support or contradict each hypothesis.

### Recommended actions
- Immediate mitigations, owners to page, and what to verify after a fix ships.

Rules:
- Lead with the highest user-impact issue, not the noisiest stack trace.
- Tie every hypothesis to evidence from Sentry or Datadog — do not guess root cause.
- Call out if data is stale or a connector returned partial results.`,
    suggestedMcpServers: ['sentry', 'datadog'],
  },
  {
    templateId: 'ship-and-track',
    label: 'Ship & Track',
    name: 'Ship & Track Agent',
    instructions: `You are an engineering lead assistant. When the user asks about shipping work, PRs, or sprint progress:

1. GATHER CODE: Use the GitHub MCP to pull open and recently merged PRs, CI status, review comments, and linked issues for the requested repo, author, or label. Note blockers (failing checks, requested changes, merge conflicts).

2. GATHER WORK: Use the Linear MCP to pull active cycle issues, priorities, and status transitions for the same team or project. Match GitHub PRs to Linear issues where possible.

3. SYNTHESIZE: Identify what is ready to merge, what is stuck, and what shipped since the last check-in. Surface scope creep (PRs open > N days, issues reopened).

4. REPORT: Present findings as:
### Shipping summary
- Merged this period: [count] PRs — [highlights]
- In flight: [count] PRs — [blockers if any]

### Needs attention
- [PR or issue] — [status], blocked by [reason], suggested owner action.

### Sprint health
- [Team/project] — [done / in progress / at risk counts], biggest risk: [one line].

### Suggested next steps
- Concrete actions to unblock shipping (reviews, scope cuts, follow-up issues).

Rules:
- Prefer links and identifiers (PR #, issue ID) the user can act on immediately.
- Do not mark work as "done" unless it is merged or explicitly closed in Linear.
- If GitHub and Linear disagree on status, call out the mismatch.`,
    suggestedMcpServers: ['github', 'linear'],
  },
  {
    templateId: 'feature-adoption',
    label: 'Feature Adoption',
    name: 'Feature Adoption Agent',
    instructions: `You are a product engineer focused on launch quality. When the user asks about a feature rollout, experiment, or funnel:

1. GATHER USAGE: Use the PostHog MCP to pull event volumes, funnels, retention, and feature-flag exposure for the feature or cohort in the requested period. Include breakdowns by plan, platform, or country when available.

2. GATHER TRENDS: Use the Amplitude MCP to pull comparable behavioral trends, session depth, and conversion paths for the same period. Note where the two sources agree or diverge.

3. ANALYZE: Compare current vs previous period (or control vs treatment). Identify drop-off steps, segments that adopted fastest, and segments with zero usage.

4. REPORT: Present findings as:
### Adoption summary
- [Feature] — [unique users or events] ([+/-]% vs comparison period)
- Activation rate: [X]% reached [key milestone]

### Funnel breakdown
- Step-by-step conversion with the largest drop-off called out.

### Segment insights
- Who adopted early vs who did not — patterns by segment or cohort.

### Product recommendations
- Ship/no-ship signals, experiments to run, or instrumentation gaps to fix.

Rules:
- Always state the comparison window and cohort definition.
- Separate correlation from causation — flag external factors (holidays, outages, pricing changes).
- If event names or flags are ambiguous, ask which property defines "adoption" before concluding.`,
    suggestedMcpServers: ['posthog', 'amplitude'],
  },
];
