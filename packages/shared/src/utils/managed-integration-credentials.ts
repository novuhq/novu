import { isAnthropicAwsProvider } from '../types/anthropic-aws';
import { AgentRuntimeProviderIdEnum, isGoogleAgentRuntimeProvider } from '../types/providers';

export type ManagedCredentialFields = {
  apiKey: string;
  region?: string;
  externalWorkspaceId?: string;
  projectName?: string;
  instanceId?: string;
};

export function buildManagedIntegrationCredentials(
  providerId: AgentRuntimeProviderIdEnum,
  fields: ManagedCredentialFields
): Record<string, string> {
  const apiKey = fields.apiKey.trim();
  const externalWorkspaceId = fields.externalWorkspaceId?.trim();
  const region = fields.region?.trim();
  const projectName = fields.projectName?.trim();
  const instanceId = fields.instanceId?.trim();

  if (isAnthropicAwsProvider(providerId)) {
    return {
      region: region ?? '',
      externalWorkspaceId: externalWorkspaceId ?? '',
      apiKey,
    };
  }

  if (isGoogleAgentRuntimeProvider(providerId)) {
    return {
      projectName: projectName ?? '',
      instanceId: instanceId ?? '',
      ...(region ? { region } : {}),
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

  if (isGoogleAgentRuntimeProvider(providerId)) {
    const projectName = fields.projectName?.trim() ?? '';
    const instanceId = fields.instanceId?.trim() ?? '';
    const location = fields.region?.trim() ?? '';

    return `${projectName}:${instanceId}:${location}`;
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

  if (isGoogleAgentRuntimeProvider(providerId)) {
    return Boolean(fields.projectName?.trim() && fields.instanceId?.trim());
  }

  return Boolean(fields.apiKey.trim());
}
