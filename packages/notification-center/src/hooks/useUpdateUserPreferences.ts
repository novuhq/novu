import { useCallback } from 'react';
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import type { IUserPreferenceSettings } from '@novu/client';

import { useNovuContext } from './useNovuContext';
import { useFetchUserPreferencesQueryKey } from './useFetchUserPreferencesQueryKey';

interface IUpdateUserPreferencesVariables {
  templateId: string;
  channelType: string;
  checked: boolean;
}

export const useUpdateUserPreferences = ({
  onSuccess,
  onError,
  ...options
}: UseMutationOptions<IUserPreferenceSettings, Error, IUpdateUserPreferencesVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();
  const userPreferencesQueryKey = useFetchUserPreferencesQueryKey();

  const updatePreferenceChecked = useCallback(
    ({ templateId, checked, channelType }: IUpdateUserPreferencesVariables) => {
      queryClient.setQueryData<IUserPreferenceSettings[]>(userPreferencesQueryKey, (oldUserPreferences) =>
        oldUserPreferences?.map((setting) => {
          if (setting.template._id === templateId) {
            return {
              ...setting,
              preference: {
                ...setting.preference,
                channels: {
                  ...setting.preference.channels,
                  [channelType]: checked,
                },
              },
            };
          }

          return setting;
        })
      );
    },
    [queryClient]
  );

  const { mutate, ...result } = useMutation<IUserPreferenceSettings, Error, IUpdateUserPreferencesVariables>(
    (variables) =>
      apiService.updateSubscriberPreference(variables.templateId, variables.channelType, variables.checked),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        queryClient.setQueryData<IUserPreferenceSettings[]>(userPreferencesQueryKey, (oldUserPreferences) =>
          oldUserPreferences?.map((setting) => {
            if (setting.template._id === data.template._id) {
              return data;
            }

            return setting;
          })
        );
        onSuccess?.(data, variables, context);
      },
      onError: (error, variables, context) => {
        updatePreferenceChecked({
          templateId: variables.templateId,
          checked: !variables.checked,
          channelType: variables.channelType,
        });
        onError?.(error, variables, context);
      },
    }
  );

  const updateUserPreferences = useCallback(
    (variables: IUpdateUserPreferencesVariables) => {
      updatePreferenceChecked(variables);
      mutate(variables);
    },
    [updatePreferenceChecked, mutate]
  );

  return { ...result, updateUserPreferences };
};
