import { DomainStatusEnum, type IEnvironment } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDomainConnectApplyUrl,
  type DomainConnectStatusResponse,
  type DomainResponse,
  fetchDomain,
  fetchDomainConnectStatus,
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
    refetchInterval: (query) => {
      const data = query.state.data;

      if (!data || data.status === DomainStatusEnum.PENDING) {
        return VERIFICATION_POLL_INTERVAL_MS;
      }

      return false;
    },
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

export function useFetchDomainConnectStatus(domain: string | undefined, options?: { enabled?: boolean }) {
  const { currentEnvironment } = useEnvironment();

  return useQuery<DomainConnectStatusResponse>({
    queryKey: [QueryKeys.fetchDomainConnectStatus, domain, currentEnvironment?._id],
    queryFn: () => {
      const args = requireDomainRequestArgs(domain, currentEnvironment);

      return fetchDomainConnectStatus(args.domain, args.currentEnvironment);
    },
    enabled: !!domain && !!currentEnvironment && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useCreateDomainConnectApplyUrl(domain: string | undefined) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (redirectUri?: string) => {
      const args = requireDomainRequestArgs(domain, currentEnvironment);

      return createDomainConnectApplyUrl(args.domain, { redirectUri }, args.currentEnvironment);
    },
    onSettled: () => {
      if (!domain || !currentEnvironment) return;

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchDomainConnectStatus, domain, currentEnvironment._id],
      });
    },
  });
}
