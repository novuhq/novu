import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { errorMessage, successMessage } from '@novu/design-system';
import { api } from '../../../api';

export const useDeleteTranslationGroup = (
  options: MutationOptions<
    {},
    { error: string; message: string; statusCode: number },
    {
      id: string;
    }
  > = {}
) => {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteTranslationGroup, ...rest } = useMutation<
    {},
    { error: string; message: string; statusCode: number },
    {
      id: string;
    }
  >(({ id }) => api.delete(`/v1/translations/groups/${id}`), {
    ...options,
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context);

      await queryClient.refetchQueries(['translationGroups']);
      await queryClient.refetchQueries(['getVariables'], { exact: false });
      successMessage('Translation group deleted');
    },
    onError: (err) => {
      errorMessage(err.message || 'Something went wrong');
    },
  });

  return {
    deleteTranslationGroup,
    ...rest,
  };
};
