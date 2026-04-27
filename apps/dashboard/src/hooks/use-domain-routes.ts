import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateDomainBody, updateDomain } from '@/api/domains';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export function useUpdateDomain(domainId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    // biome-ignore lint/style/noNonNullAssertion: domainId and currentEnvironment are guaranteed non-null when the mutation is called
    mutationFn: (body: UpdateDomainBody) => updateDomain(domainId!, body, currentEnvironment!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchDomain, domainId] });
    },
  });
}
