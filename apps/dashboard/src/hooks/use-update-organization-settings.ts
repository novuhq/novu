import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';
import {
  updateOrganizationSettings,
  UpdateOrganizationSettingsDto,
  GetOrganizationSettingsDto,
} from '../api/organization';

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
  });
}
