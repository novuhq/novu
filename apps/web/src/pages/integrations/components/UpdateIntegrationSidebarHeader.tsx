import { ChannelTypeEnum } from '@novu/shared';
import { Group } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';

import { NameInput } from '../../../design-system';
import { IntegrationChannel } from './IntegrationChannel';
import { CHANNEL_TYPE_TO_STRING } from '../../../utils/channels';
import { IntegrationEnvironmentPill } from './IntegrationEnvironmentPill';
import { useFetchEnvironments } from '../../../hooks/useFetchEnvironments';
import { ProviderImage } from './multi-provider/SelectProviderSidebar';
import { IIntegratedProvider } from '../IntegrationsStorePage';

export const UpdateIntegrationSidebarHeader = ({ provider }: { provider: IIntegratedProvider | null }) => {
  const { control } = useFormContext();
  const { environments } = useFetchEnvironments();

  if (!provider) return null;

  return (
    <Group spacing={5}>
      <Group spacing={12} w="100%" h={40}>
        <ProviderImage providerId={provider.providerId} />
        <Controller
          control={control}
          name="name"
          defaultValue=""
          render={({ field }) => {
            return (
              <NameInput
                {...field}
                value={field.value ? field.value : provider.displayName}
                data-test-id="provider-instance-name"
                placeholder="Enter instance name"
                ml={-10}
              />
            );
          }}
        />
      </Group>
      <Group spacing={16}>
        <IntegrationChannel
          name={CHANNEL_TYPE_TO_STRING[provider.channel || ChannelTypeEnum.EMAIL]}
          type={provider.channel || ChannelTypeEnum.EMAIL}
        />
        <IntegrationEnvironmentPill
          name={environments?.find((environment) => environment._id === provider.environmentId)?.name || 'Development'}
        />
      </Group>
    </Group>
  );
};
