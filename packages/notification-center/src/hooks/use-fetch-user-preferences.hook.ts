import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { IUserPreferenceSettings } from '@novu/client';

import { useNovuContext } from './use-novu-context.hook';
import { USER_PREFERENCES_QUERY_KEY } from './queryKeys';

export const useFetchUserPreferences = (
  options: UseQueryOptions<IUserPreferenceSettings[], Error, IUserPreferenceSettings[]> = {}
) => {
  const { apiService, isSessionInitialized } = useNovuContext();

  const result = useQuery<IUserPreferenceSettings[], Error, IUserPreferenceSettings[]>(
    USER_PREFERENCES_QUERY_KEY,
    () => apiService.getUserPreference(),
    {
      ...options,
      enabled: isSessionInitialized,
    }
  );

  return result;
};
