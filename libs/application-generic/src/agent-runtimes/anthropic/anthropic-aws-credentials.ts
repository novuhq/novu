import { AgentRuntimeProviderIdEnum } from '@novu/shared';

import type { ValidateCredentialsInput } from '../i-agent-runtime-provider';

export type ResolvedAwsAnthropicCredentials = {
  region: string;
  workspaceId: string;
  apiKey: string;
};

export function isAnthropicAwsProvider(providerId: string): boolean {
  return providerId === AgentRuntimeProviderIdEnum.AnthropicAws;
}

export function toValidateCredentialsInput(credentials: Record<string, unknown>): ValidateCredentialsInput {
  return {
    apiKey: credentials.apiKey as string | undefined,
    region: credentials.region as string | undefined,
    externalWorkspaceId: credentials.externalWorkspaceId as string | undefined,
  };
}

export function resolveAwsAnthropicCredentials(
  credentials: Record<string, unknown>
): ResolvedAwsAnthropicCredentials | null {
  const region = (credentials.region as string | undefined)?.trim();
  const workspaceId = (credentials.externalWorkspaceId as string | undefined)?.trim();
  const apiKey = (credentials.apiKey as string | undefined)?.trim();

  if (!region || !workspaceId || !apiKey) {
    return null;
  }

  return { region, workspaceId, apiKey };
}

export function toThalamusAwsAnthropicCredentials(credentials: ResolvedAwsAnthropicCredentials): {
  awsRegion: string;
  awsWorkspaceId: string;
  apiKey: string;
} {
  return {
    awsRegion: credentials.region,
    awsWorkspaceId: credentials.workspaceId,
    apiKey: credentials.apiKey,
  };
}
