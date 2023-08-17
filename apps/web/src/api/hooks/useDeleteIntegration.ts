import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteIntegration } from '../integration';
import { QueryKeys } from '../query.keys';

export const useDeleteIntegration = (
  options: MutationOptions<
    {},
    { error: string; message: string; statusCode: number },
    {
      id: string;
      name: string;
    }
  > = {}
) => {
  const queryClient = useQueryClient();

  const { mutate: deleteIntegrationMutate, ...rest } = useMutation<
    {},
    { error: string; message: string; statusCode: number },
    {
      id: string;
      name: string;
    }
  >(({ id }) => deleteIntegration(id), {
    ...options,
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context);

      await queryClient.refetchQueries({
        predicate: ({ queryKey }) =>
          queryKey.includes(QueryKeys.integrationsList) || queryKey.includes(QueryKeys.activeIntegrations),
      });
    },
  });

  return {
    deleteIntegration: deleteIntegrationMutate,
    ...rest,
  };
};
