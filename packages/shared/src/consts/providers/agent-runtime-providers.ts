export enum AgentRuntimeProviderIdEnum {
  Anthropic = 'anthropic',
}

export type AgentRuntimeCapabilities = {
  /** Supports adding/removing MCP servers via the provider API */
  mcpServers: boolean;
  /** Supports toggling built-in and custom tools via the provider API */
  tools: boolean;
  /** Supports selecting the underlying LLM model */
  model: boolean;
  /** Supports setting a system prompt */
  systemPrompt: boolean;
};

export type AgentRuntimeProvider = {
  providerId: AgentRuntimeProviderIdEnum;
  displayName: string;
  docsUrl?: string;
  /** URL to the provider's operational status page */
  statusUrl?: string;
  comingSoon?: boolean;
  capabilities: AgentRuntimeCapabilities;
};

export const AGENT_RUNTIME_PROVIDERS: AgentRuntimeProvider[] = [
  {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    displayName: 'Claude (Anthropic)',
    docsUrl: 'https://docs.anthropic.com/en/docs/agents',
    statusUrl: 'https://status.anthropic.com',
    capabilities: {
      mcpServers: true,
      tools: true,
      model: true,
      systemPrompt: true,
    },
  },
];

export const AGENT_RUNTIME_PROVIDER_IDS = new Set(AGENT_RUNTIME_PROVIDERS.map((p) => p.providerId));
