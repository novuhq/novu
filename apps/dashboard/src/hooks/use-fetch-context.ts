import { GetContextResponseDto } from '@novu/api/models/components';
import { ContextId, ContextType } from '@novu/shared';
import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { getContext } from '@/api/contexts';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

interface UseFetchContextParams {
  type: ContextType;
  id: ContextId;
}

export function useFetchContext(
  { type, id }: UseFetchContextParams,
  options: Omit<UseQueryOptions<GetContextResponseDto, Error>, 'queryKey' | 'queryFn'> = {}
) {
  const { currentEnvironment } = useEnvironment();

  const contextQuery = useQuery({
    queryKey: [QueryKeys.fetchContext, currentEnvironment?._id, type, id],
    queryFn: () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment available');

      return getContext({
        environment,
        type,
        id,
      });
    },
    enabled: !!currentEnvironment?._id && !!type && !!id,
    ...options,
  });

  return contextQuery;
}
