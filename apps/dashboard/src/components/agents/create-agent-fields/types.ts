export type RuntimeType = 'scratch' | 'claude' | 'vertex';

export type CreateAgentMode = 'create' | 'existing';

export type AgentTemplate = {
  label: string;
  name: string;
  instructions: string;
};

export type CreateAgentForm = {
  name: string;
  identifier: string;
  instructions: string;
  apiKey: string;
  runtime: RuntimeType;
  isExistingMode: boolean;
  externalAgentId?: string;
  externalEnvironmentId?: string;
  /**
   * Optional Anthropic workspace id. Empty/omitted means "use the default workspace".
   * Custom workspaces are identified by a `wrkspc_…` id.
   */
  externalWorkspaceId?: string;
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
};

export type CreateAgentFormErrors = {
  name?: string;
  identifier?: string;
  apiKey?: string;
  externalAgentId?: string;
  externalEnvironmentId?: string;
  integrationName?: string;
};

export const DEFAULT_CLAUDE_WORKSPACE_ID = 'default';

export const ANTHROPIC_API_KEY_HREF = 'https://console.anthropic.com/settings/keys';
export const CLAUDE_AGENT_ID_HREF = 'https://docs.claude.com/en/api/agents-list';
export const CLAUDE_ENVIRONMENT_ID_HREF = 'https://docs.claude.com/en/api/agents-list';
export const CLAUDE_WORKSPACE_HREF = 'https://console.anthropic.com/settings/workspaces';

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    label: 'Customer Support',
    name: 'Customer Support Agent',
    instructions:
      'You are a helpful customer support assistant. Answer questions clearly and concisely, and escalate complex issues when needed.',
  },
  {
    label: 'DevOps Buddy',
    name: 'DevOps Buddy',
    instructions:
      'You are a DevOps assistant. Help with CI/CD pipelines, infrastructure troubleshooting, and deployment best practices.',
  },
  {
    label: 'Code Reviewer',
    name: 'Code Reviewer',
    instructions:
      'You are a senior code reviewer. Provide constructive feedback on code quality, security, and maintainability.',
  },
  {
    label: 'Docs Helper',
    name: 'Docs Helper',
    instructions:
      'You are a documentation assistant. Help users find information, clarify concepts, and cite sources accurately.',
  },
];
