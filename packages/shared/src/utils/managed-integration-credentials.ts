import { AgentRuntimeProviderIdEnum } from '../types/providers';
import { isAnthropicAwsProvider } from '../types/anthropic-aws';

export type ManagedCredentialFields = {
  apiKey: string;
  region?: string;
  externalWorkspaceId?: string;
};

export function buildManagedIntegrationCredentials(
  providerId: AgentRuntimeProviderIdEnum,
  fields: ManagedCredentialFields
): Record<string, string> {
  const apiKey = fields.apiKey.trim();
  const externalWorkspaceId = fields.externalWorkspaceId?.trim();
  const region = fields.region?.trim();

  if (isAnthropicAwsProvider(providerId)) {
    return {
      region: region ?? '',
      externalWorkspaceId: externalWorkspaceId ?? '',
      apiKey,
    };
  }

  return {
    apiKey,
    ...(externalWorkspaceId ? { externalWorkspaceId } : {}),
  };
}

export function buildVerifyFingerprint(
  providerId: AgentRuntimeProviderIdEnum,
  fields: ManagedCredentialFields
): string {
  if (isAnthropicAwsProvider(providerId)) {
    const region = fields.region?.trim() ?? '';
    const workspaceId = fields.externalWorkspaceId?.trim() ?? '';

    return `${region}:${workspaceId}:${fields.apiKey.trim()}`;
  }

  return fields.apiKey.trim();
}

export function hasCompleteManagedCredentials(
  providerId: AgentRuntimeProviderIdEnum,
  fields: ManagedCredentialFields
): boolean {
  if (isAnthropicAwsProvider(providerId)) {
    return Boolean(fields.region?.trim() && fields.externalWorkspaceId?.trim() && fields.apiKey.trim());
  }

  return Boolean(fields.apiKey.trim());
}
