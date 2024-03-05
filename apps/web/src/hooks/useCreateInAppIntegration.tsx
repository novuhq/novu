import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import type { IResponseError, ICreateIntegrationBodyDto } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createIntegration } from '../api/integration';
import { QueryKeys } from '../api/query.keys';
import { useIntegrations } from './integrations';

export const useCreateInAppIntegration = (onSuccess: (data: any) => void) => {
  const { integrations } = useIntegrations();
  const queryClient = useQueryClient();

  const { mutateAsync: createIntegrationApi, isLoading } = useMutation<
    { _id: string; active: boolean },
    IResponseError,
    ICreateIntegrationBodyDto
  >(createIntegration, {
    onSuccess: (data) => {
      queryClient.setQueryData([QueryKeys.integrationsList], (oldData: any[] | undefined) => {
        return [...(oldData || []), data];
      });
      onSuccess(data);
    },
  });

  return {
    create: async () => {
      if (!integrations) {
        return;
      }
      const integration = integrations.find((item) => {
        return item.channel === ChannelTypeEnum.IN_APP && item.providerId === InAppProviderIdEnum.Novu;
      });
      if (integration) {
        return;
      }
      await createIntegrationApi({
        providerId: InAppProviderIdEnum.Novu,
        channel: ChannelTypeEnum.IN_APP,
        credentials: {
          hmac: false,
        },
        active: true,
        check: false,
      });
    },
    isLoading,
  };
};
