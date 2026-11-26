import { type IOrganizationCopilotSettings, resolveCopilotSettings } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type CopilotSettings, getCopilotSettings, updateCopilotSettings } from '@/api/organization';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { IS_CLOUD } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

function useCopilotSettingsQueryKey() {
  const { currentOrganization } = useAuth();

  return [QueryKeys.copilotSettings, currentOrganization?._id];
}

/**
 * The organization's Copilot switches. Each reads as on until the settings load, and when they fail to: the Copilot
 * enforces them itself, so a failed read only costs the "off" explanation.
 */
export function useCopilotSettings() {
  const { currentEnvironment } = useEnvironment();
  const { currentOrganization } = useAuth();
  const queryKey = useCopilotSettingsQueryKey();

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const environment = requireEnvironment(currentEnvironment, 'No current environment selected');
      const { data } = await getCopilotSettings({ environment, signal });

      return data;
    },
    enabled: IS_CLOUD && !!currentEnvironment?._id && !!currentOrganization?._id,
    staleTime: 60 * 1000,
    meta: { showError: false },
  });

  return { ...query, settings: resolveCopilotSettings(query.data) };
}

export function useUpdateCopilotSettings() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const queryKey = useCopilotSettingsQueryKey();

  return useMutation<CopilotSettings, Error, IOrganizationCopilotSettings, { previous?: CopilotSettings }>({
    mutationFn: async (changes) => {
      const environment = requireEnvironment(currentEnvironment, 'No current environment selected');
      const { data } = await updateCopilotSettings({ data: changes, environment });

      return data;
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CopilotSettings>(queryKey);
      queryClient.setQueryData<CopilotSettings>(queryKey, { ...resolveCopilotSettings(previous), ...changes });

      return { previous };
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKey, settings);
    },
    onError: (error, _changes, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      showErrorToast(error.message || 'There was an error updating the Copilot settings.', 'Failed to update settings');
    },
  });
}
