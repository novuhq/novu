import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { IUserPreferenceSettings } from '@novu/client';

import { useNovuContext } from './useNovuContext';
import { useFetchUserPreferencesQueryKey } from './useFetchUserPreferencesQueryKey';

export const useFetchUserPreferences = (
  options: UseQueryOptions<IUserPreferenceSettings[], Error, IUserPreferenceSettings[]> = {}
) => {
  const { apiService, isSessionInitialized, fetchingStrategy } = useNovuContext();
  const userPreferencesQueryKey = useFetchUserPreferencesQueryKey();

  const result = useQuery<IUserPreferenceSettings[], Error, IUserPreferenceSettings[]>(
    userPreferencesQueryKey,
    () => apiService.getUserPreference(),
    {
      ...options,
      enabled: isSessionInitialized && fetchingStrategy.fetchUserPreferences,
    }
  );

  return result;
};
