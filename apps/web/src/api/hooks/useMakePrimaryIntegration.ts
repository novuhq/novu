import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import type { IResponseError } from '@novu/shared';

import { errorMessage } from '../../utils/notifications';
import type { IntegrationEntity } from '../../pages/integrations/types';
import { successMessage } from '../../utils/notifications';
import { QueryKeys } from '../query.keys';
import { setIntegrationAsPrimary } from '../integration';

export const useMakePrimaryIntegration = (
  options: UseMutationOptions<IntegrationEntity, IResponseError, { id: string }> = {}
) => {
  const queryClient = useQueryClient();

  const { mutate: makePrimaryIntegration, ...rest } = useMutation<IntegrationEntity, IResponseError, { id: string }>(
    ({ id }) => setIntegrationAsPrimary(id),
    {
      ...options,
      onSuccess: (integration, variables, context) => {
        successMessage(`${integration.name} provider instance is activated and marked as the primary instance`);
        queryClient.refetchQueries({
          predicate: ({ queryKey }) =>
            queryKey.includes(QueryKeys.integrationsList) || queryKey.includes(QueryKeys.activeIntegrations),
        });
        options?.onSuccess?.(integration, variables, context);
      },
      onError: (e: any, variables, context) => {
        errorMessage(e.message || 'Unexpected error');
        options?.onError?.(e, variables, context);
      },
    }
  );

  return {
    makePrimaryIntegration,
    ...rest,
  };
};
