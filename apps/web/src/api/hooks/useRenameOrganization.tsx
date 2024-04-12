import { errorMessage } from '@novu/design-system';
import type { IResponseError } from '@novu/shared';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

import { renameOrganization as renameOrganizationApi } from '../organization';

type PayloadType = {
  name: string;
};

type ResultType = PayloadType;

export const useRenameOrganization = (options: UseMutationOptions<ResultType, IResponseError, PayloadType> = {}) => {
  const queryClient = useQueryClient();

  const { mutateAsync: renameOrganization, isLoading } = useMutation<ResultType, IResponseError, PayloadType>(
    ({ name }) => renameOrganizationApi(name),
    {
      onError: (e: unknown) => {
        if (e instanceof Error) {
          errorMessage(e.message || 'Unexpected error');
        }
      },
      onSuccess: async (result, variables, context) => {
        options?.onSuccess?.(result, variables, context);
        await queryClient.refetchQueries({
          predicate: ({ queryKey }) => queryKey.includes('/v1/organizations'),
        });
      },
    }
  );

  return {
    renameOrganization,
    isLoading,
  };
};
