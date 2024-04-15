import type { IResponseError } from '@novu/shared';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../../utils/notifications';
import { updateBrandingSettings } from '../organization';

type BrandColor = string;
type FontColor = string;

export type UpdateOrgBrandingPayloadType = {
  logo?: string;
  color?: BrandColor;
  fontColor?: FontColor;
  fontFamily?: string;
  contentBackgroundValue?: string;
};

type ResultType = UpdateOrgBrandingPayloadType;

export const useUpdateOrganizationBranding = (
  options: UseMutationOptions<ResultType, IResponseError, UpdateOrgBrandingPayloadType> = {}
) => {
  const queryClient = useQueryClient();

  const { mutateAsync: updateOrganizationBranding, isLoading } = useMutation<
    ResultType,
    IResponseError,
    UpdateOrgBrandingPayloadType
  >((payload) => updateBrandingSettings({ ...payload, logo: payload.logo || undefined }), {
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
  });

  return {
    updateOrganizationBranding,
    isLoading,
  };
};
