import { useMemo } from 'react';

import { INFINITE_NOTIFICATIONS_QUERY_KEY } from './queryKeys';
import { useSetQueryKey } from './useSetQueryKey';
import { useStore } from './useStore';

export const useFetchNotificationsQueryKey = () => {
  const { storeQuery } = useStore();
  const setQueryKey = useSetQueryKey();
  const queryKey = useMemo(
    () => setQueryKey([...INFINITE_NOTIFICATIONS_QUERY_KEY, storeQuery]),
    [setQueryKey, storeQuery]
  );

  return queryKey;
};
