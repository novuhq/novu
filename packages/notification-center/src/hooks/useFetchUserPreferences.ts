import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { IUserPreferenceSettings } from '@novu/client';

import { useNovuContext } from './useNovuContext';
import { USER_PREFERENCES_QUERY_KEY } from './queryKeys';
import { useSetQueryKey } from './useSetQueryKey';

export const useFetchUserPreferences = (
  options: UseQueryOptions<IUserPreferenceSettings[], Error, IUserPreferenceSettings[]> = {}
) => {
  const { apiService, isSessionInitialized, fetchingStrategy } = useNovuContext();
  const setQueryKey = useSetQueryKey();

  const result = useQuery<IUserPreferenceSettings[], Error, IUserPreferenceSettings[]>(
    setQueryKey(USER_PREFERENCES_QUERY_KEY),
    () => apiService.getUserPreference(),
    {
      ...options,
      enabled: isSessionInitialized && fetchingStrategy.fetchUserPreferences,
    }
  );

  return result;
};
