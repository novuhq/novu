import { useMemo } from 'react';
import type { IStoreQuery } from '@novu/client';

import { FEED_UNSEEN_COUNT_QUERY_KEY } from './queryKeys';
import { useSetQueryKey } from './useSetQueryKey';

export const useFeedUnseenCountQueryKey = (query?: IStoreQuery) => {
  const setQueryKey = useSetQueryKey();
  const queryKey = useMemo(() => setQueryKey([...FEED_UNSEEN_COUNT_QUERY_KEY, query]), [setQueryKey, query]);

  return queryKey;
};
