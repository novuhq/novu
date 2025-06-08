import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';
import {
  updateOrganizationSettings,
  UpdateOrganizationSettingsDto,
  GetOrganizationSettingsDto,
} from '../api/organization';
import { showErrorToast } from '@/components/primitives/sonner-helpers';

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
