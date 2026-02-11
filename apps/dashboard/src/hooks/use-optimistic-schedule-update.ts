import { GetSubscriberPreferencesDto, ScheduleDto } from '@novu/api/models/components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchSubscriberPreferences } from '@/api/subscribers';
import { useAuth } from '@/context/auth/hooks';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { convertContextKeysToPayload } from '@/utils/context-variable-utils';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type PatchSubscriberPreferencesParameters = OmitEnvironmentFromParameters<typeof patchSubscriberPreferences>;

type UseOptimisticScheduleUpdateProps = {
  subscriberId: string;
  contextKeys?: string[];
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export const useOptimisticScheduleUpdate = ({
  subscriberId,
  contextKeys,
  onSuccess,
  onError,
}: UseOptimisticScheduleUpdateProps) => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const queryKey = [
    QueryKeys.fetchSubscriberPreferences,
    currentOrganization?._id,
    currentEnvironment?._id,
    subscriberId,
    contextKeys,
  ];

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (args: PatchSubscriberPreferencesParameters) => {
      const environment = requireEnvironment(currentEnvironment, 'Environment is not available');

      return patchSubscriberPreferences({ environment, ...args });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<GetSubscriberPreferencesDto>(queryKey);
      if (previousData) {
        const optimisticData: GetSubscriberPreferencesDto = {
          ...previousData,
          global: {
            ...previousData.global,
            schedule: {
              ...previousData.global.schedule,
              ...variables.preferences.schedule,
              isEnabled: variables.preferences.schedule?.isEnabled ?? previousData.global.schedule?.isEnabled ?? false,
            },
          },
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

  const updateSchedule = async (schedule: ScheduleDto) => {
    const context = convertContextKeysToPayload(contextKeys);

    return mutateAsync({
      subscriberId,
      preferences: { schedule, context },
    });
  };

  return {
    updateSchedule,
    isPending,
  };
};
