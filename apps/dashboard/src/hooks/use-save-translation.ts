import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveTranslation } from '@/api/translations';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

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

      queryClient.refetchQueries({ queryKey: [QueryKeys.fetchTranslationKeys] });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      // Invalidate preview queries to refetch with updated translations
      queryClient.invalidateQueries({ queryKey: [QueryKeys.previewStep] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.previewLayout] });

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
