import type { IResponseError } from '@novu/shared';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../../utils/notifications';
import { updateBrandingSettings, UpdateOrgBrandingPayloadType } from '../organization';

type PayloadType = UpdateOrgBrandingPayloadType;
type ResultType = UpdateOrgBrandingPayloadType;

export const useUpdateOrganizationBranding = (
  options: UseMutationOptions<ResultType, IResponseError, PayloadType> = {}
) => {
  const queryClient = useQueryClient();

  const { mutateAsync: updateOrganizationBranding, isLoading } = useMutation<ResultType, IResponseError, PayloadType>(
    (payload) => updateBrandingSettings({ ...payload, logo: payload.logo || undefined }),
    {
      onSuccess: async (result, variables, context) => {
        await queryClient.refetchQueries({
          predicate: ({ queryKey }) => queryKey.includes('/v1/organizations'),
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
    updateOrganizationBranding,
    isLoading,
  };
};
