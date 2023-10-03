import { Group, useMantineColorScheme } from '@mantine/core';
import React from 'react';
import { useOutletContext } from 'react-router-dom';

import { ChannelTypeEnum, providers, StepTypeEnum } from '@novu/shared';

import { StepNameInput } from './StepNameInput';
import { stepIcon, stepNames } from '../constants';
import { useGetPrimaryIntegration, useHasActiveIntegrations } from '../../../hooks';
import { CONTEXT_PATH } from '../../../config';
import { DisplayPrimaryProviderIcon } from '../workflow/DisplayPrimaryProviderIcon';

export const StepName = ({
  channel,
  color = undefined,
  index,
  variantIndex,
}: {
  channel: StepTypeEnum | ChannelTypeEnum;
  index: number;
  variantIndex?: number;
  color?: any;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const { onDelete }: any = useOutletContext();
  const path = variantIndex ? `steps.${index}.variants.${variantIndex}` : `steps.${index}`;

  const { hasActiveIntegration, isChannelStep, activeIntegrationsByEnv } = useHasActiveIntegrations({
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
    <Group noWrap>
      <DisplayPrimaryProviderIcon
        Icon={Icon}
        disabledProp={{}}
        providerIntegration={providerIntegration}
        isChannelStep={isChannelStep}
        logoSrc={logoSrc}
      />
      <StepNameInput variantIndex={variantIndex} defaultValue={stepNames[channel]} index={index} />
    </Group>
  );
};
