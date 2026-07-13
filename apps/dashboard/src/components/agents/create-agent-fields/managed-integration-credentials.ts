import {
  AgentRuntimeProviderIdEnum,
  buildManagedIntegrationCredentials,
  buildVerifyFingerprint,
  hasCompleteManagedCredentials,
  isAnthropicAwsProvider,
  type ManagedCredentialFields,
} from '@novu/shared';

import type { VerifyManagedCredentialsBody } from '@/api/agents';

export type { ManagedCredentialFields };

export { buildManagedIntegrationCredentials, buildVerifyFingerprint, hasCompleteManagedCredentials };

export function buildVerifyCredentialsPayload(
  providerId: AgentRuntimeProviderIdEnum,
  fields: ManagedCredentialFields
): VerifyManagedCredentialsBody {
  const payload: VerifyManagedCredentialsBody = {
    providerId,
    apiKey: fields.apiKey.trim(),
  };

  if (isAnthropicAwsProvider(providerId)) {
    payload.region = fields.region?.trim();
    payload.externalWorkspaceId = fields.externalWorkspaceId?.trim();
  } else if (fields.externalWorkspaceId?.trim()) {
    payload.externalWorkspaceId = fields.externalWorkspaceId.trim();
  }

  return payload;
}
