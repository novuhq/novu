import { useMemo } from 'react';

import { UNSEEN_COUNT_QUERY_KEY } from './queryKeys';
import { useSetQueryKey } from './useSetQueryKey';
import { useStore } from './useStore';

export const useUnseenCountQueryKey = () => {
  const { storeQuery } = useStore();
  const setQueryKey = useSetQueryKey();
  const queryKey = useMemo(() => setQueryKey([...UNSEEN_COUNT_QUERY_KEY, storeQuery]), [setQueryKey, storeQuery]);

  return queryKey;
};
