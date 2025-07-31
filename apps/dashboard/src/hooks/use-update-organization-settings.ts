import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import {
  GetOrganizationSettingsDto,
  UpdateOrganizationSettingsDto,
  updateOrganizationSettings,
} from '../api/organization';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';

export function useUpdateOrganizationSettings() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation<{ data: GetOrganizationSettingsDto }, Error, UpdateOrganizationSettingsDto>({
    mutationFn: async (data) => {
      return updateOrganizationSettings({ data, environment: currentEnvironment! });
    },
    onMutate: async (newSettings) => {
      const queryKey = [QueryKeys.organizationSettings, currentEnvironment?._id];

      // Optimistically update the cache
      const previousData = queryClient.getQueryData<{ data: GetOrganizationSettingsDto }>(queryKey);

      if (previousData) {
        queryClient.setQueryData(queryKey, {
          ...previousData,
          data: {
            ...previousData.data,
            ...newSettings,
          },
        });
      }
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationGroups],
        exact: false,
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      const queryKey = [QueryKeys.organizationSettings, currentEnvironment?._id];

      // Update with the actual server response
      await queryClient.setQueryData(queryKey, response);
    },
    onError: (error) => {
      // Just invalidate on error to refetch the correct data
      const queryKey = [QueryKeys.organizationSettings, currentEnvironment?._id];
      queryClient.invalidateQueries({ queryKey });

      showErrorToast(
        error?.message || 'There was an error updating organization settings.',
        'Failed to update settings'
      );
    },
  });
}
