import type { IUserGlobalPreferenceSettings } from '@novu/client';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { useFetchUserGlobalPreferencesQueryKey } from './useFetchUserGlobalPreferencesQueryKey';
import { useNovuContext } from './useNovuContext';

export const useFetchUserGlobalPreferences = (
  options: UseQueryOptions<IUserGlobalPreferenceSettings[], Error, IUserGlobalPreferenceSettings[]> = {}
) => {
  const { apiService, isSessionInitialized, fetchingStrategy } = useNovuContext();
  const userGlobalPreferencesQueryKey = useFetchUserGlobalPreferencesQueryKey();

  const result = useQuery<IUserGlobalPreferenceSettings[], Error, IUserGlobalPreferenceSettings[]>(
    userGlobalPreferencesQueryKey,
    () => apiService.getUserGlobalPreference(),
    {
      ...options,
      enabled: isSessionInitialized && fetchingStrategy.fetchUserGlobalPreferences,
    }
  );

  return result;
};
