import { Group, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, providers, StepTypeEnum } from '@novu/shared';

import { StepNameInput } from './StepNameInput';
import { stepIcon, stepNames } from '../constants';
import { useGetPrimaryIntegration, useHasActiveIntegrations } from '../../../hooks';
import { CONTEXT_PATH } from '../../../config';
import { DisplayPrimaryProviderIcon } from '../workflow/DisplayPrimaryProviderIcon';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { StepNameLabel } from './StepNameLabel';

export const StepName = ({ channel }: { channel: StepTypeEnum | ChannelTypeEnum }) => {
  const { colorScheme } = useMantineColorScheme();
  const path = useStepFormPath();

  const { isChannelStep, activeIntegrationsByEnv } = useHasActiveIntegrations({
    filterByEnv: true,
    channelType: channel as unknown as ChannelTypeEnum,
  });
  const { primaryIntegration, isPrimaryStep } = useGetPrimaryIntegration({
    filterByEnv: true,
    channelType: channel as unknown as ChannelTypeEnum,
  });
  const providerIntegration = isPrimaryStep
    ? primaryIntegration
    : activeIntegrationsByEnv?.find((integration) => integration.channel === (channel as unknown as ChannelTypeEnum))
        ?.providerId;

  const provider = providers.find((_provider) => _provider.id === providerIntegration);

  const logoSrc = provider && `${CONTEXT_PATH}/static/images/providers/${colorScheme}/square/${provider?.id}.svg`;

  const Icon = stepIcon[channel];

  return (
    <Group noWrap spacing={12} sx={{ alignItems: 'flex-start', maxWidth: 800, width: '100%' }}>
      <DisplayPrimaryProviderIcon
        Icon={Icon}
        disabledProp={{}}
        providerIntegration={providerIntegration}
        isChannelStep={isChannelStep}
        logoSrc={logoSrc}
      />
      <StepNameInput path={path} defaultValue={stepNames[channel]} label={<StepNameLabel />} />
    </Group>
  );
};
