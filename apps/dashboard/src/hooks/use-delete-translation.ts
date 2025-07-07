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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationGroups],
        exact: false,
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslations, currentEnvironment?._id],
        exact: false,
      });
    },
  });
};
