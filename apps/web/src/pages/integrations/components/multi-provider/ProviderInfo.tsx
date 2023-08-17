import { Group } from '@mantine/core';
import { ChannelTypeEnum, IEnvironment } from '@novu/shared';

import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import type { IIntegratedProvider } from '../../types';
import { IntegrationChannel } from '../IntegrationChannel';
import { IntegrationEnvironmentPill } from '../IntegrationEnvironmentPill';

export const ProviderInfo = ({
  provider,
  environments,
}: {
  provider: IIntegratedProvider | null;
  environments: IEnvironment[] | undefined;
}) => (
  <Group spacing={16} mt={10}>
    <IntegrationChannel
      name={CHANNEL_TYPE_TO_STRING[provider?.channel || ChannelTypeEnum.EMAIL]}
      type={provider?.channel || ChannelTypeEnum.EMAIL}
      testId="provider-instance-channel"
    />
    <IntegrationEnvironmentPill
      name={environments?.find((environment) => environment._id === provider?.environmentId)?.name || 'Development'}
      testId="provider-instance-environment"
    />
  </Group>
);
