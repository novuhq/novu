import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTranslation } from '@/api/translations';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type DeleteTranslationParameters = OmitEnvironmentFromParameters<typeof deleteTranslation>;

export const useDeleteTranslation = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: DeleteTranslationParameters) => deleteTranslation({ environment: currentEnvironment!, ...args }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationGroups],
        exact: false,
      });

      await queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.fetchTranslation,
          variables.resourceId,
          variables.resourceType,
          variables.locale,
          currentEnvironment?._id,
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.fetchTranslationGroup,
          variables.resourceId,
          variables.resourceType,
          currentEnvironment?._id,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });
    },
  });
};
