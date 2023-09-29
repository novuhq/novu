import { useMemo } from 'react';

import { USER_PREFERENCES_QUERY_KEY } from './queryKeys';
import { useSetQueryKey } from './useSetQueryKey';

export const useFetchUserPreferencesQueryKey = () => {
  const setQueryKey = useSetQueryKey();
  const queryKey = useMemo(() => setQueryKey([...USER_PREFERENCES_QUERY_KEY]), [setQueryKey]);

  return queryKey;
};
