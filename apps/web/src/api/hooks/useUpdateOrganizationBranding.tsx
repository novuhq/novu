import type { IResponseError } from '@novu/shared';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

import { useCallback } from 'react';
import { errorMessage } from '../../utils/notifications';
import { updateBrandingSettings } from '../organization';

type PayloadType = {
  logo?: string;
  color?: string;
};

type ResultType = PayloadType;

export const useUpdateOrganizationBranding = (
  options: UseMutationOptions<ResultType, IResponseError, PayloadType> = {}
) => {
  const queryClient = useQueryClient();

  const { mutateAsync: updateOrganizationBranding, isLoading } = useMutation<ResultType, IResponseError, PayloadType>(
    (payload) => updateBrandingSettings(payload),
    {
      onSuccess: async (result, variables, context) => {
        await queryClient.refetchQueries({
          predicate: ({ queryKey }) => queryKey.includes('/v1/organizations'),
        });
        options?.onSuccess?.(result, variables, context);
      },
      onError: (e: any) => {
        errorMessage(e.message || 'Unexpected error');
      },
    }
  );

  const updateOrganizationBrandingCallback = useCallback(
    async (data: PayloadType) => {
      await updateOrganizationBranding(data);
    },
    [updateOrganizationBranding]
  );

  return {
    updateOrganizationBranding: updateOrganizationBrandingCallback,
    isLoading,
  };
};
