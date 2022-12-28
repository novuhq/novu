import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import type { IUserPreferenceSettings } from '@novu/client';

import { useNovuContext } from './use-novu-context.hook';
import { USER_PREFERENCES_QUERY_KEY } from './queryKeys';

interface IUpdateUserPreferencesVariables {
  templateId: string;
  channelType: string;
  checked: boolean;
}

export const useUpdateUserPreferences = ({
  onSuccess,
  ...options
}: UseMutationOptions<IUserPreferenceSettings, Error, IUpdateUserPreferencesVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService } = useNovuContext();

  const { mutate, ...result } = useMutation<IUserPreferenceSettings, Error, IUpdateUserPreferencesVariables>(
    (variables) =>
      apiService.updateSubscriberPreference(variables.templateId, variables.channelType, variables.checked),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        queryClient.setQueryData<IUserPreferenceSettings[]>(USER_PREFERENCES_QUERY_KEY, (oldUserPreferences) =>
          oldUserPreferences.map((setting) => {
            if (setting.template._id === data.template._id) {
              return data;
            }

            return setting;
          })
        );
        onSuccess?.(data, variables, context);
      },
    }
  );

  return { ...result, updateUserPreferences: mutate };
};
