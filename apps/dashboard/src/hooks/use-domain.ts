import { DomainStatusEnum, type IEnvironment } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type DomainConnectStatusResponse,
  type DomainResponse,
  type UpdateDomainBody,
  fetchDomain,
  fetchDomainAutoConfigure,
  startDomainAutoConfigure,
  updateDomain,
  verifyDomain,
} from '@/api/domains';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

const VERIFICATION_POLL_INTERVAL_MS = 5_000;

function requireDomainRequestArgs<TEnvironment extends Pick<IEnvironment, '_id'>>(
  domain: string | undefined,
  currentEnvironment: TEnvironment | undefined
) {
  if (!domain || !currentEnvironment) {
    throw new Error('Domain request requires a domain and environment.');
  }

  return { domain, currentEnvironment };
}

export function useFetchDomain(domain: string | undefined) {
  const { currentEnvironment } = useEnvironment();

  return useQuery<DomainResponse>({
    queryKey: [QueryKeys.fetchDomain, domain, currentEnvironment?._id],
    queryFn: () => {
      const args = requireDomainRequestArgs(domain, currentEnvironment);

      return fetchDomain(args.domain, args.currentEnvironment);
    },
    enabled: !!domain && !!currentEnvironment,
  });
}

export function useRefreshDomain(domain: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return {
    refresh: () =>
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchDomain, domain, currentEnvironment?._id],
      }),
  };
}

export function useVerifyDomain(domain: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: () => {
      const args = requireDomainRequestArgs(domain, currentEnvironment);

      return verifyDomain(args.domain, args.currentEnvironment);
    },
    onSuccess: (data) => {
      if (!domain || !currentEnvironment) return;

      queryClient.setQueryData([QueryKeys.fetchDomain, domain, currentEnvironment._id], data);
    },
  });
}

export function useUpdateDomain(domain: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (body: UpdateDomainBody) => {
      const args = requireDomainRequestArgs(domain, currentEnvironment);

      return updateDomain(args.domain, body, args.currentEnvironment);
    },
    onSuccess: (data) => {
      if (!domain || !currentEnvironment) return;

      queryClient.setQueryData([QueryKeys.fetchDomain, domain, currentEnvironment._id], data);
    },
  });
}

export function usePollDomainVerification(domain: string | undefined, currentStatus: DomainStatusEnum | undefined) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const isPending = currentStatus === DomainStatusEnum.PENDING;

  useQuery({
    queryKey: [QueryKeys.fetchDomain, domain, currentEnvironment?._id, 'verify-poll'],
    queryFn: async () => {
      const args = requireDomainRequestArgs(domain, currentEnvironment);
      const data = await verifyDomain(args.domain, args.currentEnvironment);

      queryClient.setQueryData([QueryKeys.fetchDomain, domain, currentEnvironment?._id], data);

      return data;
    },
    enabled: !!domain && !!currentEnvironment && isPending,
    refetchInterval: VERIFICATION_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

export function useFetchDomainAutoConfigure(domain: string | undefined, options?: { enabled?: boolean }) {
  const { currentEnvironment } = useEnvironment();

  return useQuery<DomainConnectStatusResponse>({
    queryKey: [QueryKeys.fetchDomainConnectStatus, domain, currentEnvironment?._id],
    queryFn: () => {
      const args = requireDomainRequestArgs(domain, currentEnvironment);

      return fetchDomainAutoConfigure(args.domain, args.currentEnvironment);
    },
    enabled: !!domain && !!currentEnvironment && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useStartDomainAutoConfigure(domain: string | undefined) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (redirectUri?: string) => {
      const args = requireDomainRequestArgs(domain, currentEnvironment);

      return startDomainAutoConfigure(args.domain, { redirectUri }, args.currentEnvironment);
    },
    onSettled: () => {
      if (!domain || !currentEnvironment) return;

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchDomainConnectStatus, domain, currentEnvironment._id],
      });
    },
  });
}
