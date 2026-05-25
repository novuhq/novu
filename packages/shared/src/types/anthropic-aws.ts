import { AgentRuntimeProviderIdEnum } from './providers';

export type AnthropicAwsCredentials = {
  region: string;
  externalWorkspaceId: string;
  apiKey: string;
  externalEnvironmentId?: string;
};

export function isAnthropicAwsProvider(providerId: string): boolean {
  return providerId === AgentRuntimeProviderIdEnum.AnthropicAws;
}
