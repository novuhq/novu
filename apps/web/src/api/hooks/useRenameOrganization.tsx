import { errorMessage } from '@novu/design-system';
import type { IResponseError } from '@novu/shared';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { renameOrganization as renameOrganizationApi } from '../organization';

type PayloadType = {
  name: string;
};

type ResultType = PayloadType;

export const useRenameOrganization = (options: UseMutationOptions<ResultType, IResponseError, PayloadType> = {}) => {
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<ResultType, IResponseError, PayloadType>(
    ({ name }) => renameOrganizationApi(name),
    {
      onError: (e) => {
        errorMessage(e.message || 'Unexpected error');
      },
      onSuccess: async (result, variables, context) => {
        options?.onSuccess?.(result, variables, context);
        await queryClient.refetchQueries({
          predicate: ({ queryKey }) => queryKey.includes('/v1/organizations'),
        });
      },
    }
  );

  const renameOrganization = useCallback(
    async ({ name }: PayloadType) => {
      await mutateAsync({
        name,
      });
    },
    [mutateAsync]
  );

  return {
    renameOrganization,
    isLoading,
  };
};
