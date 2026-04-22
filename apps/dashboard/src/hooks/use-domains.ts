import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateDomainBody, createDomain, DomainResponse, deleteDomain, fetchDomains } from '@/api/domains';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export function useFetchDomains() {
  const { currentEnvironment } = useEnvironment();

  return useQuery<DomainResponse[]>({
    queryKey: [QueryKeys.fetchDomains, currentEnvironment?._id],
    queryFn: () => fetchDomains(currentEnvironment!),
    enabled: !!currentEnvironment,
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (body: CreateDomainBody) => createDomain(body, currentEnvironment!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomains] });
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: (domainId: string) => deleteDomain(domainId, currentEnvironment!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomains] });
    },
  });
}
