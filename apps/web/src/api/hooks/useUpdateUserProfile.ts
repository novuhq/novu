import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import type { IResponseError, IUserEntity } from '@novu/shared';

import { updateUserProfile } from '../user';

interface IUpdateUserProfileVariables {
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
}

export const useUpdateUserProfile = (
  options: UseMutationOptions<IUserEntity, IResponseError, IUpdateUserProfileVariables> = {}
) => {
  const queryClient = useQueryClient();

  const { mutate: updateUserProfileMutation, ...rest } = useMutation<
    IUserEntity,
    IResponseError,
    IUpdateUserProfileVariables
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
    ...rest,
  };
};
