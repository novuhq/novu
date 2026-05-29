import { ServiceAccountScopeEnum, SigningSecretTypeEnum } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import {
  createApiKeyCredential,
  createServiceAccount,
  createSigningSecret,
  deleteServiceAccount,
  enableApiKeysV2,
  listApiKeyCredentials,
  listServiceAccounts,
  listSigningSecrets,
  revokeApiKeyCredential,
} from '@/api/service-accounts';
import { QueryKeys } from '@/utils/query-keys';

export function useServiceAccounts() {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.serviceAccounts, currentEnvironment?._id],
    queryFn: () =>
      listServiceAccounts({
        environment: currentEnvironment!,
        filterEnvironmentId: currentEnvironment?._id,
      }),
    enabled: !!currentEnvironment?._id,
  });
}

export function useCreateServiceAccount() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; scope: ServiceAccountScopeEnum; environmentId?: string }) =>
      createServiceAccount({ environment: currentEnvironment!, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serviceAccounts, currentEnvironment?._id] });
    },
  });
}

export function useDeleteServiceAccount() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceAccountId: string) =>
      deleteServiceAccount({ environment: currentEnvironment!, serviceAccountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serviceAccounts, currentEnvironment?._id] });
    },
  });
}

export function useApiKeyCredentials(serviceAccountId: string) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.apiKeyCredentials, currentEnvironment?._id, serviceAccountId],
    queryFn: () => listApiKeyCredentials({ environment: currentEnvironment!, serviceAccountId }),
    enabled: !!currentEnvironment?._id && !!serviceAccountId,
  });
}

export function useCreateApiKeyCredential(serviceAccountId: string) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body?: { name?: string }) =>
      createApiKeyCredential({ environment: currentEnvironment!, serviceAccountId, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.apiKeyCredentials, currentEnvironment?._id, serviceAccountId],
      });
    },
  });
}

export function useRevokeApiKeyCredential(serviceAccountId: string) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apiKeyId: string) =>
      revokeApiKeyCredential({ environment: currentEnvironment!, serviceAccountId, apiKeyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.apiKeyCredentials, currentEnvironment?._id, serviceAccountId],
      });
    },
  });
}

export function useEnableApiKeysV2() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => enableApiKeysV2({ environment: currentEnvironment! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.signingSecrets, currentEnvironment?._id] });
    },
  });
}

export function useSigningSecrets() {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.signingSecrets, currentEnvironment?._id],
    queryFn: () => listSigningSecrets({ environment: currentEnvironment! }),
    enabled: !!currentEnvironment?._id,
  });
}

export function useCreateSigningSecret() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: SigningSecretTypeEnum) => createSigningSecret({ environment: currentEnvironment!, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.signingSecrets, currentEnvironment?._id] });
    },
  });
}
