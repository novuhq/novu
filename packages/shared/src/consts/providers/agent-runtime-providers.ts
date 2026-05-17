import { AgentRuntimeProviderIdEnum } from '../../types/providers';
import { CLAUDE_MCP_SERVERS, type ClaudeMcpServer } from './claude-mcp-servers';
import { CLAUDE_ANTHROPIC_SKILLS, type ClaudeAnthropicSkill } from './claude-skills';
import { CLAUDE_BUILTIN_TOOLS, type ClaudeBuiltinTool } from './claude-tools';
import { anthropicAgentConfig } from './credentials';
import type { IConfigCredential, ILogoFileName } from './provider.interface';

export { AgentRuntimeProviderIdEnum };

export type AgentRuntimeCapabilities = {
  /** Supports adding/removing MCP servers via the provider API */
  mcpServers: boolean;
  /** Supports toggling built-in and custom tools via the provider API */
  tools: boolean;
  /** Supports selecting the underlying LLM model */
  model: boolean;
  /** Supports setting a system prompt */
  systemPrompt: boolean;
  /** Supports attaching Anthropic-managed and custom skills */
  skills: boolean;
};

export type AgentRuntimeProvider = {
  providerId: AgentRuntimeProviderIdEnum;
  displayName: string;
  docsUrl?: string;
  /** URL to the provider's operational status page */
  statusUrl?: string;
  comingSoon?: boolean;
  logoFileName: ILogoFileName;
  capabilities: AgentRuntimeCapabilities;
  credentials: IConfigCredential[];
  /** Static catalog of built-in tools the provider supports */
  availableTools?: ClaudeBuiltinTool[];
  /** Static catalog of remote MCP servers the provider supports */
  availableMcpServers?: ClaudeMcpServer[];
  /** Static catalog of Anthropic-managed skills the provider supports */
  availableSkills?: ClaudeAnthropicSkill[];
};

export const AGENT_RUNTIME_PROVIDERS: AgentRuntimeProvider[] = [
  {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    displayName: 'Claude (Anthropic)',
    docsUrl: 'https://docs.anthropic.com/en/docs/agents',
    statusUrl: 'https://status.anthropic.com',
    logoFileName: { light: 'anthropic.svg', dark: 'anthropic.svg' },
    credentials: anthropicAgentConfig,
    capabilities: {
      mcpServers: true,
      tools: true,
      model: true,
      systemPrompt: true,
      skills: true,
    },
    availableTools: CLAUDE_BUILTIN_TOOLS,
    availableMcpServers: CLAUDE_MCP_SERVERS,
    availableSkills: CLAUDE_ANTHROPIC_SKILLS,
  },
];

export const AGENT_RUNTIME_PROVIDER_IDS = new Set(AGENT_RUNTIME_PROVIDERS.map((p) => p.providerId));
