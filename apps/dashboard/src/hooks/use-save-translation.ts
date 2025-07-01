import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { saveTranslation } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';
import { showSuccessToast, showErrorToast } from '@/components/primitives/sonner-helpers';

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

      // Also invalidate translation keys if this is a default locale update
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationKeys, variables.resourceId, variables.locale, currentEnvironment?._id],
      });

      showSuccessToast('Translation saved successfully');
    },
    onError: (error) => {
      showErrorToast(error instanceof Error ? error.message : 'Failed to save translation', 'Save failed');
    },
  });
};
