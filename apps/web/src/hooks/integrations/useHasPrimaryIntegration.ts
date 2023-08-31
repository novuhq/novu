import { ChannelTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useIsMultiProviderConfigurationEnabled } from '../useFeatureFlags';
import { useHasActiveIntegrations } from './useHasActiveIntegrations';

type UseHasPrimaryIntegrationProps = {
  filterByEnv?: boolean;
  channelType: ChannelTypeEnum;
};

export function useHasPrimaryIntegration({ filterByEnv = true, channelType }: UseHasPrimaryIntegrationProps) {
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();

  const { activeIntegrationsByEnv, hasActiveIntegration, isChannelStep } = useHasActiveIntegrations({
    filterByEnv,
    channelType,
  });

  const getPrimaryIntegration = useMemo(() => {
    if (!isMultiProviderConfigurationEnabled) {
      return activeIntegrationsByEnv?.find((integration) => integration.channel === channelType && integration.active)
        ?.providerId;
    }

    if (!hasActiveIntegration || !isChannelStep) {
      return undefined;
    }

    if ([ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS].includes(channelType)) {
      return activeIntegrationsByEnv?.find((integration) => integration.primary && integration.channel === channelType)
        ?.providerId;
    }

    return activeIntegrationsByEnv?.find((integration) => integration.channel === channelType)?.providerId;
  }, [isChannelStep, hasActiveIntegration, activeIntegrationsByEnv, channelType, channelType]);

  return {
    primaryIntegration: getPrimaryIntegration,
  };
}
