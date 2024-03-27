import { useMemo } from 'react';

import { UNREAD_COUNT_QUERY_KEY } from './queryKeys';
import { useSetQueryKey } from './useSetQueryKey';
import { useStore } from './useStore';

export const useUnreadCountQueryKey = () => {
  const { storeQuery } = useStore();
  const setQueryKey = useSetQueryKey();
  const queryKey = useMemo(() => setQueryKey([...UNREAD_COUNT_QUERY_KEY, storeQuery]), [setQueryKey, storeQuery]);

  return queryKey;
};
