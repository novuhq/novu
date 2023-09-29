import type { IUserGlobalPreferenceSettings } from '@novu/client';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useFetchUserGlobalPreferencesQueryKey } from './useFetchUserGlobalPreferencesQueryKey';
import { useNovuContext } from './useNovuContext';

interface IUpdateUserGlobalPreferencesVariables {
  preferences: { channelType: string; enabled: boolean }[];
  enabled?: boolean;
}

export const useUpdateUserGlobalPreferences = ({
  onSuccess,
  onError,
  ...options
}: UseMutationOptions<IUserGlobalPreferenceSettings, Error, IUpdateUserGlobalPreferencesVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();
  const userGlobalPreferencesQueryKey = useFetchUserGlobalPreferencesQueryKey();

  const updateGlobalPreferenceChecked = useCallback(
    ({ enabled, preferences }: IUpdateUserGlobalPreferencesVariables) => {
      queryClient.setQueryData<IUserGlobalPreferenceSettings>(userGlobalPreferencesQueryKey, (old) => {
        return {
          preference: {
            enabled: enabled ?? old.preference.enabled,
            channels: {
              ...old.preference.channels,
              ...preferences.reduce((acc, { channelType, enabled: channelEnabled }) => {
                acc[channelType] = channelEnabled;

                return acc;
              }, {} as Record<string, boolean>),
            },
          },
        };
      });
    },
    [queryClient]
  );

  const { mutate, ...result } = useMutation<
    IUserGlobalPreferenceSettings,
    Error,
    IUpdateUserGlobalPreferencesVariables
  >((variables) => apiService.updateSubscriberGlobalPreference(variables.preferences, variables.enabled), {
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData<IUserGlobalPreferenceSettings[]>(userGlobalPreferencesQueryKey, () => [data]);
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      updateGlobalPreferenceChecked({
        enabled: !variables.enabled ?? undefined,
        preferences: variables.preferences,
      });
      onError?.(error, variables, context);
    },
  });

  const updateUserGlobalPreferences = useCallback(
    (variables: IUpdateUserGlobalPreferencesVariables) => {
      updateGlobalPreferenceChecked(variables);
      mutate(variables);
    },
    [updateGlobalPreferenceChecked, mutate]
  );

  return { ...result, updateUserGlobalPreferences };
};
