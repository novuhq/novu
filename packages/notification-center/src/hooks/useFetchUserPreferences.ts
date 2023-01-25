import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { IUserPreferenceSettings } from '@novu/client';

import { useNovuContext } from './useNovuContext';
import { USER_PREFERENCES_QUERY_KEY } from './queryKeys';

export const useFetchUserPreferences = (
  options: UseQueryOptions<IUserPreferenceSettings[], Error, IUserPreferenceSettings[]> = {}
) => {
  const { apiService, isSessionInitialized, fetchingStrategy } = useNovuContext();

  const result = useQuery<IUserPreferenceSettings[], Error, IUserPreferenceSettings[]>(
    USER_PREFERENCES_QUERY_KEY,
    () => apiService.getUserPreference(),
    {
      ...options,
      enabled: isSessionInitialized && fetchingStrategy.fetchUserPreferences,
    }
  );

  return result;
};
