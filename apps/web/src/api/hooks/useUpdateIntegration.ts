import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IResponseError, IUpdateIntegrationBodyDto } from '@novu/shared';

import { errorMessage } from '../../utils/notifications';
import { updateIntegration } from '../integration';
import type { IntegrationEntity } from '../../pages/integrations/types';
import { successMessage } from '../../utils/notifications';
import { QueryKeys } from '../query.keys';

export const useUpdateIntegration = (integrationId: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync: updateIntegrationMutation, isLoading: isLoadingUpdate } = useMutation<
    IntegrationEntity,
    IResponseError,
    {
      id: string;
      data: IUpdateIntegrationBodyDto;
    }
  >(({ id, data }) => updateIntegration(id, data), {
    onSuccess: async () => {
      await queryClient.refetchQueries({
        predicate: ({ queryKey }) =>
          queryKey.includes(QueryKeys.integrationsList) || queryKey.includes(QueryKeys.activeIntegrations),
      });
      successMessage('Instance configuration updated');
    },
    onError: (e: any) => {
      errorMessage(e.message || 'Unexpected error');
    },
  });

  const updateIntegrationCallback = async (data: IUpdateIntegrationBodyDto) => {
    await updateIntegrationMutation({
      id: integrationId,
      data: { ...data, check: false },
    });
  };

  return {
    updateIntegration: updateIntegrationCallback,
    isLoadingUpdate,
  };
};
