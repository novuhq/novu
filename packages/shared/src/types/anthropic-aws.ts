import { AgentRuntimeProviderIdEnum } from './providers';

export const DEFAULT_CLAUDE_WORKSPACE_ID = 'default';

export type AnthropicAwsCredentials = {
  region: string;
  externalWorkspaceId: string;
  apiKey: string;
  externalEnvironmentId?: string;
};

const CLAUDE_PLATFORM_CONSOLE_PROVIDER_IDS = new Set<string>([
  AgentRuntimeProviderIdEnum.Anthropic,
  AgentRuntimeProviderIdEnum.NovuAnthropic,
  AgentRuntimeProviderIdEnum.AnthropicAws,
]);

export function isAnthropicAwsProvider(providerId: string): boolean {
  return providerId === AgentRuntimeProviderIdEnum.AnthropicAws;
}

export function isClaudePlatformConsoleProvider(providerId: string): boolean {
  return CLAUDE_PLATFORM_CONSOLE_PROVIDER_IDS.has(providerId);
}

export function buildClaudePlatformAgentConsoleUrl(externalAgentId: string, externalWorkspaceId?: string): string {
  const workspaceId = encodeURIComponent(externalWorkspaceId?.trim() || DEFAULT_CLAUDE_WORKSPACE_ID);

  return `https://platform.claude.com/workspaces/${workspaceId}/agents/${encodeURIComponent(externalAgentId)}`;
}
