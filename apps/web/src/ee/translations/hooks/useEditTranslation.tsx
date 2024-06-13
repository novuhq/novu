import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api';
import { ITranslationGroup } from './useFetchTranslationGroups';

export const useEditTranslation = (
  options: UseMutationOptions<
    ITranslationGroup,
    { error: string; message: string; statusCode: number },
    {
      locale: string;
      fileName?: string;
      identifier: string;
      translation?: string;
    }
  > = {}
) => {
  const queryClient = useQueryClient();

  const {
    error,
    isLoading,
    mutateAsync: editTranslation,
  } = useMutation<
    ITranslationGroup,
    { error: string; message: string; statusCode: number },
    {
      locale: string;
      fileName?: string;
      identifier: string;
      translation?: string;
    }
  >(
    async ({ locale, fileName, identifier, translation }) => {
      if (!fileName && !translation) {
        return;
      }
      const payload = {
        fileName,
        translation,
      };

      return await api.patch(`/v1/translations/groups/${identifier}/locales/${locale}`, payload);
    },
    {
      ...options,
      onSuccess: async (data, variables, context) => {
        options.onSuccess?.(data, variables, context);

        await queryClient.refetchQueries([`group/${variables.identifier}`]);
        await queryClient.refetchQueries([`group/${variables.identifier}/${variables.locale}`]);
        await queryClient.refetchQueries(['translationGroups']);
      },
      onError: (err, variables, context) => {
        options.onError?.(err, variables, context);
      },
    }
  );

  return {
    error,
    isLoading,
    editTranslation,
  };
};
