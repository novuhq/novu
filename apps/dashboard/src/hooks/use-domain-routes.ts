import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NovuApiError } from '@/api/api.client';
import {
  CreateDomainRouteBody,
  createDomainRoute,
  deleteDomainRoute,
  fetchDomainRoute,
  fetchDomainRoutes,
  ListDomainRoutesParams,
  UpdateDomainRouteBody,
  updateDomainRoute,
} from '@/api/domains';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

function requireDomain(domain: string | undefined): string {
  if (!domain) {
    throw new Error('Domain route request requires a domain.');
  }

  return domain;
}

export function useFetchDomainRoutes(domain: string | undefined, params: ListDomainRoutesParams = {}) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchDomainRoutes, domain, currentEnvironment?._id, params],
    queryFn: () =>
      fetchDomainRoutes(
        requireDomain(domain),
        requireEnvironment(currentEnvironment, 'No environment selected'),
        params
      ),
    enabled: !!domain && !!currentEnvironment,
  });
}

export function useFetchDomainRoute(domain: string | undefined, address: string | undefined) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchDomainRoutes, domain, currentEnvironment?._id, address],
    queryFn: async () => {
      try {
        return await fetchDomainRoute(
          requireDomain(domain),
          requireDomain(address),
          requireEnvironment(currentEnvironment, 'No environment selected')
        );
      } catch (error) {
        if (error instanceof NovuApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: !!domain && !!address && !!currentEnvironment,
    retry: (failureCount, error) => {
      if (error instanceof NovuApiError && error.status === 404) {
        return false;
      }

      return failureCount < 3;
    },
  });
}

export function useCreateDomainRoute(domain: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (body: CreateDomainRouteBody) =>
      createDomainRoute(requireDomain(domain), body, requireEnvironment(currentEnvironment, 'No environment selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomainRoutes] });
    },
  });
}

export function useUpdateDomainRoute(domain: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: ({ address, body }: { address: string; body: UpdateDomainRouteBody }) =>
      updateDomainRoute(
        requireDomain(domain),
        address,
        body,
        requireEnvironment(currentEnvironment, 'No environment selected')
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomainRoutes] });
    },
  });
}

export function useDeleteDomainRoute(domain: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (address: string) =>
      deleteDomainRoute(
        requireDomain(domain),
        address,
        requireEnvironment(currentEnvironment, 'No environment selected')
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomainRoutes] });
    },
  });
}
