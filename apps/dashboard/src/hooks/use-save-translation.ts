import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { saveTranslation } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type SaveTranslationParameters = OmitEnvironmentFromParameters<typeof saveTranslation>;

export const useSaveTranslation = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: SaveTranslationParameters) => saveTranslation({ environment: currentEnvironment!, ...args }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.fetchTranslation,
          variables.resourceId,
          variables.resourceType,
          variables.locale,
          currentEnvironment?._id,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslations, currentEnvironment?._id],
      });
    },
  });
};
