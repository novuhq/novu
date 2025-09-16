import { GetSubscriberPreferencesDto, PatchPreferenceChannelsDto } from '@novu/api/models/components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchSubscriberPreferences } from '@/api/subscribers';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type PatchSubscriberPreferencesParameters = OmitEnvironmentFromParameters<typeof patchSubscriberPreferences>;

type UseOptimisticChannelPreferencesProps = {
  subscriberId: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export const useOptimisticChannelPreferences = ({
  subscriberId,
  onSuccess,
  onError,
}: UseOptimisticChannelPreferencesProps) => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const queryKey = [
    QueryKeys.fetchSubscriberPreferences,
    currentOrganization?._id,
    currentEnvironment?._id,
    subscriberId,
  ];

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (args: PatchSubscriberPreferencesParameters) => {
      if (!currentEnvironment) {
        throw new Error('Environment is not available');
      }
      return patchSubscriberPreferences({ environment: currentEnvironment, ...args });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<GetSubscriberPreferencesDto>(queryKey);

      if (previousData) {
        const optimisticData: GetSubscriberPreferencesDto = {
          ...previousData,
          global: {
            ...previousData.global,
            channels: {
              ...previousData.global.channels,
              ...variables.preferences.channels,
            },
          },
          workflows: previousData.workflows.map((workflow) => {
            if (variables.preferences.workflowId && workflow.workflow.slug === variables.preferences.workflowId) {
              return {
                ...workflow,
                channels: {
                  ...workflow.channels,
                  ...variables.preferences.channels,
                },
              };
            }
            return workflow;
          }),
        };

        queryClient.setQueryData(queryKey, optimisticData);
      }

      return { previousData };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      onError?.(error);
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateChannelPreferences = async (channels: PatchPreferenceChannelsDto, workflowId?: string) => {
    return mutateAsync({
      subscriberId,
      preferences: { channels, workflowId },
    });
  };

  return {
    updateChannelPreferences,
    isPending,
  };
};
