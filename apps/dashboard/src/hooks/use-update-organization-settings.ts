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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.organizationSettings, currentEnvironment?._id] });
    },
    onError: (error) => {
      showErrorToast(
        error?.message || 'There was an error updating organization settings.',
        'Failed to update settings'
      );
    },
  });
}
