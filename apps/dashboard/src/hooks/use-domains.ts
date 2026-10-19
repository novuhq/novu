import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateDomainBody,
  CursorPaginatedResponse,
  createDomain,
  DomainResponse,
  deleteDomain,
  fetchDomains,
  ListDomainsParams,
} from '@/api/domains';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export function useFetchDomains(params: ListDomainsParams = {}) {
  const { currentEnvironment } = useEnvironment();

  return useQuery<CursorPaginatedResponse<DomainResponse>>({
    queryKey: [QueryKeys.fetchDomains, currentEnvironment?._id, params],
    queryFn: () => fetchDomains(requireEnvironment(currentEnvironment, 'No environment selected'), params),
    enabled: !!currentEnvironment,
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (body: CreateDomainBody) =>
      createDomain(body, requireEnvironment(currentEnvironment, 'No environment selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomains] });
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (domain: string) =>
      deleteDomain(domain, requireEnvironment(currentEnvironment, 'No environment selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomains] });
    },
  });
}
