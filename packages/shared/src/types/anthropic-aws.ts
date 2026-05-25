import { AgentRuntimeProviderIdEnum } from './providers';

/** Credentials for Claude Platform on AWS (API key auth). */
export type AnthropicAwsCredentials = {
  region: string;
  externalWorkspaceId: string;
  apiKey: string;
  externalEnvironmentId?: string;
};

export function isAnthropicAwsProvider(providerId: string): boolean {
  return providerId === AgentRuntimeProviderIdEnum.AnthropicAws;
}
