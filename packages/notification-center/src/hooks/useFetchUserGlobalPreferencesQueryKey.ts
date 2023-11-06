import { useMemo } from 'react';

import { USER_GLOBAL_PREFERENCES_QUERY_KEY } from './queryKeys';
import { useSetQueryKey } from './useSetQueryKey';

export const useFetchUserGlobalPreferencesQueryKey = () => {
  const setQueryKey = useSetQueryKey();
  const queryKey = useMemo(() => setQueryKey([...USER_GLOBAL_PREFERENCES_QUERY_KEY]), [setQueryKey]);

  return queryKey;
};
