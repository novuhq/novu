import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { IStoreQuery } from '@novu/client';

import { useNovuContext } from './useNovuContext';
import { FEED_UNSEEN_COUNT_QUERY_KEY } from './queryKeys';
import type { ICountData } from '../shared/interfaces';
import { useSetQueryKey } from './useSetQueryKey';

export const useFeedUnseenCount = (
  { query }: { query?: IStoreQuery },
  options: UseQueryOptions<ICountData, Error, ICountData> = {}
) => {
  const { apiService, isSessionInitialized } = useNovuContext();
  const setQueryKey = useSetQueryKey();

  const result = useQuery<ICountData, Error, ICountData>(
    setQueryKey([...FEED_UNSEEN_COUNT_QUERY_KEY, query]),
    () => apiService.getTabCount(query),
    {
      ...options,
      enabled: isSessionInitialized,
    }
  );

  return result;
};
