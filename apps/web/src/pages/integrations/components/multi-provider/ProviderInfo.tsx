import { Group } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import { IntegrationChannel } from '../IntegrationChannel';
import { IntegrationEnvironmentPill } from '../IntegrationEnvironmentPill';

export const ProviderInfo = ({ provider, environments }) => (
  <Group mb={16} mt={16} spacing={16}>
    <IntegrationChannel
      name={CHANNEL_TYPE_TO_STRING[provider?.channel || ChannelTypeEnum.EMAIL]}
      type={provider?.channel || ChannelTypeEnum.EMAIL}
    />
    <IntegrationEnvironmentPill
      name={environments?.find((environment) => environment._id === provider?.environmentId)?.name || 'Development'}
    />
  </Group>
);
