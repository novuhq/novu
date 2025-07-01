import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { deleteTranslation } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type DeleteTranslationParameters = OmitEnvironmentFromParameters<typeof deleteTranslation>;

export const useDeleteTranslation = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: DeleteTranslationParameters) => deleteTranslation({ environment: currentEnvironment!, ...args }),
    onSuccess: async (_, variables) => {
      // Invalidate and refetch all translation-related queries
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslation, currentEnvironment?._id],
        exact: false,
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslations, currentEnvironment?._id],
        exact: false,
      });

      // Force refetch to ensure data is fresh
      await queryClient.refetchQueries({
        queryKey: [QueryKeys.fetchTranslations, currentEnvironment?._id],
        exact: false,
      });
    },
  });
};
