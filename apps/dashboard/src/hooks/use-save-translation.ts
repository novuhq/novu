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
    onMutate: async (variables) => {
      // Optimistically update the cache with the new content
      const queryKey = [
        QueryKeys.fetchTranslation,
        variables.resourceId,
        variables.resourceType,
        variables.locale,
        currentEnvironment?._id,
      ];

      const previousTranslation = queryClient.getQueryData(queryKey);

      if (previousTranslation) {
        queryClient.setQueryData(queryKey, {
          ...previousTranslation,
          content: variables.content,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousTranslation, queryKey };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.fetchTranslationGroup,
          variables.resourceId,
          variables.resourceType,
          currentEnvironment?._id,
        ],
      });

      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchTranslationGroups] });

      // Also invalidate translation keys if this is a default locale update
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationKeys, variables.resourceId, variables.locale, currentEnvironment?._id],
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      showSuccessToast('Translation saved successfully');
    },
    onError: (error, variables, context) => {
      // Roll back on error
      if (context?.previousTranslation) {
        queryClient.setQueryData(context.queryKey, context.previousTranslation);
      }

      showErrorToast(error instanceof Error ? error.message : 'Failed to save translation', 'Save failed');
    },
  });
};
