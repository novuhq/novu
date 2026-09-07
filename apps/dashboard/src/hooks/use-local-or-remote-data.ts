import { QueryObserverResult, RefetchOptions, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

type LocalOrRemoteQueryResult<TData> = {
  data: TData | undefined;
  isPending: boolean;
  error: unknown;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<TData, Error>>;
};

/**
 * Runs a remote TanStack query unless `isLocalRoute` is active, in which case
 * the caller-supplied local cache value is returned with the same result shape.
 */
export function useLocalOrRemoteData<TData>({
  isLocalRoute,
  localData,
  localIsPending,
  localRefetch,
  queryKey,
  queryFn,
  enabled,
  gcTime,
}: {
  isLocalRoute: boolean;
  localData: TData | undefined;
  localIsPending: boolean;
  localRefetch?: () => Promise<unknown>;
  queryKey: unknown[];
  queryFn: () => Promise<TData>;
  enabled: boolean;
  gcTime?: number;
}): LocalOrRemoteQueryResult<TData> {
  const { data, isPending, error, refetch } = useQuery<TData>({
    queryKey,
    queryFn,
    enabled: enabled && !isLocalRoute,
    gcTime,
  });

  const refetchLocal = useCallback(
    async (_options?: RefetchOptions) => {
      if (localRefetch) {
        await localRefetch();
      }

      return { data: localData } as QueryObserverResult<TData, Error>;
    },
    [localRefetch, localData]
  );

  if (isLocalRoute) {
    return {
      data: localData,
      isPending: localIsPending,
      error: null,
      refetch: refetchLocal,
    };
  }

  return {
    data,
    isPending,
    error,
    refetch,
  };
}
