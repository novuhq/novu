import type {
  IEnvironment,
  PermissionsEnum,
  ServiceAccountScopeEnum,
  SigningSecretTypeEnum,
} from '@novu/shared';
import { del, get, post } from './api.client';

export type ServiceAccount = {
  _id: string;
  name: string;
  scope: ServiceAccountScopeEnum;
  environmentId?: string;
  defaultPermissions: PermissionsEnum[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ApiKeyCredential = {
  _id: string;
  serviceAccountId: string;
  keyPrefix: string;
  last4: string;
  name?: string;
  permissions: PermissionsEnum[];
  metadata?: Record<string, unknown>;
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
};

export type CreateApiKeyCredentialResponse = ApiKeyCredential & {
  key: string;
};

export type SigningSecret = {
  _id: string;
  type: SigningSecretTypeEnum;
  environmentId: string;
  status: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
};

export type CreateSigningSecretResponse = SigningSecret & {
  secret: string;
};

export async function listServiceAccounts({
  environment,
  filterEnvironmentId,
}: {
  environment: IEnvironment;
  filterEnvironmentId?: string;
}) {
  const params = filterEnvironmentId ? `?environmentId=${filterEnvironmentId}` : '';

  return get<ServiceAccount[]>(`/service-accounts${params}`, { environment });
}

export async function createServiceAccount({
  environment,
  body,
}: {
  environment: IEnvironment;
  body: {
    name: string;
    scope: ServiceAccountScopeEnum;
    environmentId?: string;
    defaultPermissions?: PermissionsEnum[];
    metadata?: Record<string, unknown>;
  };
}) {
  return post<ServiceAccount>(`/service-accounts`, { environment, body });
}

export async function deleteServiceAccount({
  environment,
  serviceAccountId,
}: {
  environment: IEnvironment;
  serviceAccountId: string;
}) {
  return del<void>(`/service-accounts/${serviceAccountId}`, { environment });
}

export async function listApiKeyCredentials({
  environment,
  serviceAccountId,
}: {
  environment: IEnvironment;
  serviceAccountId: string;
}) {
  return get<ApiKeyCredential[]>(`/service-accounts/${serviceAccountId}/keys`, { environment });
}

export async function createApiKeyCredential({
  environment,
  serviceAccountId,
  body,
}: {
  environment: IEnvironment;
  serviceAccountId: string;
  body?: {
    name?: string;
    permissions?: PermissionsEnum[];
    metadata?: Record<string, unknown>;
    expiresAt?: string;
  };
}) {
  return post<CreateApiKeyCredentialResponse>(`/service-accounts/${serviceAccountId}/keys`, { environment, body });
}

export async function revokeApiKeyCredential({
  environment,
  serviceAccountId,
  apiKeyId,
}: {
  environment: IEnvironment;
  serviceAccountId: string;
  apiKeyId: string;
}) {
  return post<void>(`/service-accounts/${serviceAccountId}/keys/${apiKeyId}/revoke`, { environment });
}

export async function enableApiKeysV2({ environment }: { environment: IEnvironment }) {
  return post<{ seeded: boolean }>(`/signing-secrets/enable-v2`, { environment });
}

export async function listSigningSecrets({
  environment,
  type,
}: {
  environment: IEnvironment;
  type?: SigningSecretTypeEnum;
}) {
  const params = type ? `?type=${type}` : '';

  return get<SigningSecret[]>(`/signing-secrets${params}`, { environment });
}

export async function createSigningSecret({
  environment,
  type,
}: {
  environment: IEnvironment;
  type: SigningSecretTypeEnum;
}) {
  return post<CreateSigningSecretResponse>(`/signing-secrets`, { environment, body: { type } });
}
