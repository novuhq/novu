import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { errorMessage, successMessage } from '@novu/design-system';
import { api } from '../../../api';

export const useDeleteTranslation = (
  options: MutationOptions<
    {},
    { error: string; message: string; statusCode: number },
    {
      identifier: string;
      locale: string;
    }
  > = {}
) => {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteTranslation, ...rest } = useMutation<
    {},
    { error: string; message: string; statusCode: number },
    {
      identifier: string;
      locale: string;
    }
  >(({ identifier, locale }) => api.delete(`/v1/translations/groups/${identifier}/locales/${locale}`), {
    ...options,
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context);

      await queryClient.refetchQueries(['translationGroups'], { exact: false });
      await queryClient.refetchQueries(['getVariables'], { exact: false });
      await queryClient.refetchQueries([`group/${variables.identifier}`], { exact: false });
      successMessage('Translation file deleted');
    },
    onError: (err) => {
      errorMessage(err.message || 'Something went wrong');
    },
  });

  return {
    deleteTranslation,
    ...rest,
  };
};
