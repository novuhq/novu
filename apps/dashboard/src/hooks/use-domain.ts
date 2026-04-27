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
  domainId: string | undefined,
  currentEnvironment: TEnvironment | undefined
) {
  if (!domainId || !currentEnvironment) {
    throw new Error('Domain request requires a domain and environment.');
  }

  return { domainId, currentEnvironment };
}

export function useFetchDomain(domainId: string | undefined) {
  const { currentEnvironment } = useEnvironment();

  return useQuery<DomainResponse>({
    queryKey: [QueryKeys.fetchDomain, domainId, currentEnvironment?._id],
    queryFn: () => {
      const args = requireDomainRequestArgs(domainId, currentEnvironment);

      return fetchDomain(args.domainId, args.currentEnvironment);
    },
    enabled: !!domainId && !!currentEnvironment,
    refetchInterval: (query) => {
      const data = query.state.data;

      if (!data || data.status === DomainStatusEnum.PENDING) {
        return VERIFICATION_POLL_INTERVAL_MS;
      }

      return false;
    },
  });
}

export function useRefreshDomain(domainId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return {
    refresh: () =>
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchDomain, domainId, currentEnvironment?._id],
      }),
  };
}

export function useFetchDomainConnectStatus(domainId: string | undefined, options?: { enabled?: boolean }) {
  const { currentEnvironment } = useEnvironment();

  return useQuery<DomainConnectStatusResponse>({
    queryKey: [QueryKeys.fetchDomainConnectStatus, domainId, currentEnvironment?._id],
    queryFn: () => {
      const args = requireDomainRequestArgs(domainId, currentEnvironment);

      return fetchDomainConnectStatus(args.domainId, args.currentEnvironment);
    },
    enabled: !!domainId && !!currentEnvironment && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useCreateDomainConnectApplyUrl(domainId: string | undefined) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (redirectUri?: string) => {
      const args = requireDomainRequestArgs(domainId, currentEnvironment);

      return createDomainConnectApplyUrl(args.domainId, { redirectUri }, args.currentEnvironment);
    },
    onSettled: () => {
      if (!domainId || !currentEnvironment) return;

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchDomainConnectStatus, domainId, currentEnvironment._id],
      });
    },
  });
}
