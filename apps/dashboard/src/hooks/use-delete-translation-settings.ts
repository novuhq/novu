import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { deleteTranslationSettings, TranslationSettingsDto } from '../api/translation-settings';

/**
 * Hook to delete translation settings for the current organization
 *
 * Removes all translation settings with optimistic update.
 * This will disable automatic translation until settings are reconfigured.
 *
 * On success, sets the cache to null.
 * On error, rolls back and shows an error toast.
 *
 * @returns Mutation result with mutate/mutateAsync functions
 */
export function useDeleteTranslationSettings() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!currentEnvironment) {
        throw new Error('Environment not available. Please try again.');
      }
      return deleteTranslationSettings({ environment: currentEnvironment });
    },
    onMutate: async () => {
      const queryKey = [QueryKeys.translationSettings, currentEnvironment?._id];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData<TranslationSettingsDto | null>(queryKey);

      // Optimistically set to null (deleted)
      queryClient.setQueryData(queryKey, null);

      return { previousData };
    },
    onSuccess: async () => {
      const queryKey = [QueryKeys.translationSettings, currentEnvironment?._id];

      // Ensure cache is set to null after successful deletion
      queryClient.setQueryData(queryKey, null);
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
        error?.message || 'There was an error deleting translation settings.',
        'Failed to delete translation settings'
      );
    },
  });
}
