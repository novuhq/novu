import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import type { IResponseError, IUpdateUserProfile, IUserEntity } from '@novu/shared';

import { updateUserProfile } from '../user';

export const useUpdateUserProfile = (
  options: UseMutationOptions<IUserEntity, IResponseError, IUpdateUserProfile> = {}
) => {
  const queryClient = useQueryClient();

  const { mutate: updateUserProfileMutation, ...mutationData } = useMutation<
    IUserEntity,
    IResponseError,
    IUpdateUserProfile
  >(updateUserProfile, {
    ...options,
    onSuccess: async (data, variables, context) => {
      options.onSuccess?.(data, variables, context);
      if (data) {
        queryClient.setQueryData(['/v1/users/me'], data);
      }
    },
  });

  return {
    updateUserProfile: updateUserProfileMutation,
    ...mutationData,
  };
};
