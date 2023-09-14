import { ChannelTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useIsMultiProviderConfigurationEnabled } from '../useFeatureFlags';
import { useHasActiveIntegrations } from './useHasActiveIntegrations';

type UseHasPrimaryIntegrationProps = {
  filterByEnv?: boolean;
  channelType: ChannelTypeEnum;
};

export function useGetPrimaryIntegration({ filterByEnv = true, channelType }: UseHasPrimaryIntegrationProps) {
  const isPrimaryStep = useMemo(
    () => channelType === ChannelTypeEnum.EMAIL || channelType === ChannelTypeEnum.SMS,
    [channelType]
  );
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();

  const { activeIntegrationsByEnv, hasActiveIntegration } = useHasActiveIntegrations({
    filterByEnv,
    channelType,
  });

  const getPrimaryIntegration = useMemo(() => {
    if (!hasActiveIntegration || !isPrimaryStep) {
      return undefined;
    }

    if (!isMultiProviderConfigurationEnabled) {
      return activeIntegrationsByEnv?.find((integration) => integration.channel === channelType && integration.active)
        ?.providerId;
    }

    return activeIntegrationsByEnv?.find((integration) => integration.primary && integration.channel === channelType)
      ?.providerId;
  }, [isMultiProviderConfigurationEnabled, hasActiveIntegration, activeIntegrationsByEnv, channelType, isPrimaryStep]);

  return {
    primaryIntegration: getPrimaryIntegration,
    isPrimaryStep,
  };
}
