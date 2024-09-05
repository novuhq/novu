import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api';
import { ITranslationGroup } from './useFetchTranslationGroups';

export const useUploadTranslations = (
  options: UseMutationOptions<
    ITranslationGroup,
    { error: string; message: string; statusCode: number },
    {
      locales: string[];
      files: File[];
      identifier: string;
    }
  > = {}
) => {
  const queryClient = useQueryClient();

  const {
    error,
    isLoading,
    mutateAsync: uploadTranslations,
  } = useMutation<
    ITranslationGroup,
    { error: string; message: string; statusCode: number },
    {
      locales: string[];
      files: File[];
      identifier: string;
    }
  >(
    async ({ locales, files, identifier }) => {
      const formData = new FormData();
      const data = JSON.stringify(locales);
      formData.append('locales', data);
      for (let i = 0; i < files.length; i += 1) {
        // skip non json files
        if (!files[i].name.endsWith('.json')) {
          continue;
        }
        formData.append('files', files[i]);
      }

      return await api.post(`/v1/translations/groups/${identifier}`, formData);
    },
    {
      ...options,
      onSuccess: async (data, variables, context) => {
        options.onSuccess?.(data, variables, context);
        await queryClient.refetchQueries([`group/${variables.identifier}`]);
      },
      onError: (err, variables, context) => {
        options.onError?.(err, variables, context);
      },
    }
  );

  return {
    error,
    isLoading,
    uploadTranslations,
  };
};
