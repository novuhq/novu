import { Group } from '@mantine/core';
import { ChannelTypeEnum, IEnvironment } from '@novu/shared';

import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import { IIntegratedProvider } from '../../IntegrationsStorePage';
import { IntegrationChannel } from '../IntegrationChannel';
import { IntegrationEnvironmentPill } from '../IntegrationEnvironmentPill';

export const ProviderInfo = ({
  provider,
  environments,
}: {
  provider: IIntegratedProvider | null;
  environments: IEnvironment[] | undefined;
}) => (
  <Group spacing={16}>
    <IntegrationChannel
      name={CHANNEL_TYPE_TO_STRING[provider?.channel || ChannelTypeEnum.EMAIL]}
      type={provider?.channel || ChannelTypeEnum.EMAIL}
    />
    <IntegrationEnvironmentPill
      name={environments?.find((environment) => environment._id === provider?.environmentId)?.name || 'Development'}
    />
  </Group>
);
