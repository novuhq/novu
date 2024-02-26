import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IResponseError } from '@novu/shared';

import { deleteIntegration } from '../integration';
import { QueryKeys } from '../query.keys';

export const useDeleteIntegration = (
  options: MutationOptions<{}, IResponseError, { id: string; name: string }> = {}
) => {
  const queryClient = useQueryClient();

  const { mutate: deleteIntegrationMutate, ...rest } = useMutation<{}, IResponseError, { id: string; name: string }>(
    ({ id }) => deleteIntegration(id),
    {
      ...options,
      onSuccess: async (data, variables, context) => {
        options?.onSuccess?.(data, variables, context);

        await queryClient.refetchQueries({
          predicate: ({ queryKey }) =>
            queryKey.includes(QueryKeys.integrationsList) || queryKey.includes(QueryKeys.activeIntegrations),
        });
      },
    }
  );

  return {
    deleteIntegration: deleteIntegrationMutate,
    ...rest,
  };
};
