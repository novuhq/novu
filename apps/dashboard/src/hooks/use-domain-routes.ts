import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateDomainRouteBody,
  createDomainRoute,
  deleteDomainRoute,
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
