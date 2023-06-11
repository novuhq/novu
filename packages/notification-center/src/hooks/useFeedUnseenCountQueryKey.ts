import { useMemo } from 'react';

import { FEED_UNSEEN_COUNT_QUERY_KEY } from './queryKeys';
import { useStore } from './useStore';
import { useSetQueryKey } from './useSetQueryKey';

export const useFeedUnseenCountQueryKey = () => {
  const { storeQuery } = useStore();
  const setQueryKey = useSetQueryKey();
  const queryKey = useMemo(() => setQueryKey([...FEED_UNSEEN_COUNT_QUERY_KEY, storeQuery]), [setQueryKey, storeQuery]);

  return queryKey;
};
