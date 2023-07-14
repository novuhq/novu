import { MutationOptions, useMutation } from '@tanstack/react-query';

import { deleteIntegration } from '../integration';

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
  const { mutate: deleteIntegrationMutate, ...rest } = useMutation<
    {},
    { error: string; message: string; statusCode: number },
    {
      id: string;
      name: string;
    }
  >(({ id }) => deleteIntegration(id), {
    ...options,
  });

  return {
    deleteIntegration: deleteIntegrationMutate,
    ...rest,
  };
};
