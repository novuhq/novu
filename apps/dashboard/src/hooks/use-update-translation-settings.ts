import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import {
  updateTranslationSettings,
  TranslationSettingsDto,
  UpdateTranslationSettingsDto,
} from '../api/translation-settings';

/**
 * Hook to update or create translation settings
 *
 * Performs an upsert operation with optimistic updates.
 * On success, invalidates the translation settings cache.
 * On error, rolls back the optimistic update and shows an error toast.
 *
 * @returns Mutation result with mutate/mutateAsync functions
 */
export function useUpdateTranslationSettings() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<TranslationSettingsDto, Error, UpdateTranslationSettingsDto>({
    mutationFn: async (data) => {
      if (!currentEnvironment) {
        throw new Error('Environment not available. Please try again.');
      }
      return updateTranslationSettings({ data, environment: currentEnvironment });
    },
    onMutate: async (newSettings) => {
      const queryKey = [QueryKeys.translationSettings, currentEnvironment?._id];

      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData<TranslationSettingsDto | null>(queryKey);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<TranslationSettingsDto>(queryKey, {
          ...previousData,
          ...newSettings,
          // If API key is provided, update the hasApiKey flag
          hasApiKey: newSettings.openaiApiKey ? true : previousData.hasApiKey,
          // Don't expose the API key in cache - clear it
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousData };
    },
    onSuccess: async (response) => {
      const queryKey = [QueryKeys.translationSettings, currentEnvironment?._id];

      // Update cache with actual server response
      queryClient.setQueryData(queryKey, response);
    },
    onError: (error, _variables, context) => {
      const queryKey = [QueryKeys.translationSettings, currentEnvironment?._id];

      // Rollback to previous data on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      } else {
        // Invalidate to refetch correct data
        queryClient.invalidateQueries({ queryKey });
      }

      showErrorToast(
        error?.message || 'There was an error updating translation settings.',
        'Failed to update translation settings'
      );
    },
  });
}
