import type { IResponseError } from '@novu/shared';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { errorMessage, successMessage } from '../../utils/notifications';
import { updateOrganizationSettings, UpdateOrganizationSettingsDto, GetOrganizationSettingsDto } from '../organization';

type PayloadType = UpdateOrganizationSettingsDto;
type ResultType = { data: GetOrganizationSettingsDto };

export const useUpdateOrganizationSettings = (
  options: UseMutationOptions<ResultType, IResponseError, PayloadType> = {}
) => {
  const queryClient = useQueryClient();

  const { mutateAsync: updateSettings, isLoading } = useMutation<ResultType, IResponseError, PayloadType>(
    (payload) => updateOrganizationSettings(payload),
    {
      onSuccess: async (result, variables, context) => {
        successMessage('Organization settings updated successfully');
        await queryClient.invalidateQueries({
          queryKey: ['organizationSettings'],
        });
        options?.onSuccess?.(result, variables, context);
      },
      onError: (e: unknown) => {
        if (e instanceof Error) {
          errorMessage(e.message || 'Unexpected error');
        }
      },
    }
  );

  return {
    updateSettings,
    isLoading,
  };
};
