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

function requireDomainId(domainId: string | undefined): string {
  if (!domainId) {
    throw new Error('Domain route request requires a domain.');
  }

  return domainId;
}

export function useFetchDomainRoutes(domainId: string | undefined, params: ListDomainRoutesParams = {}) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchDomainRoutes, domainId, currentEnvironment?._id, params],
    queryFn: () =>
      fetchDomainRoutes(
        requireDomainId(domainId),
        requireEnvironment(currentEnvironment, 'No environment selected'),
        params
      ),
    enabled: !!domainId && !!currentEnvironment,
  });
}

export function useCreateDomainRoute(domainId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (body: CreateDomainRouteBody) =>
      createDomainRoute(
        requireDomainId(domainId),
        body,
        requireEnvironment(currentEnvironment, 'No environment selected')
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomainRoutes] });
    },
  });
}

export function useUpdateDomainRoute(domainId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: ({ routeId, body }: { routeId: string; body: UpdateDomainRouteBody }) =>
      updateDomainRoute(
        requireDomainId(domainId),
        routeId,
        body,
        requireEnvironment(currentEnvironment, 'No environment selected')
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomainRoutes] });
    },
  });
}

export function useDeleteDomainRoute(domainId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (routeId: string) =>
      deleteDomainRoute(
        requireDomainId(domainId),
        routeId,
        requireEnvironment(currentEnvironment, 'No environment selected')
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomainRoutes] });
    },
  });
}
