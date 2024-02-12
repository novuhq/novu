import { ChannelTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useHasActiveIntegrations } from './useHasActiveIntegrations';

type UseHasPrimaryIntegrationProps = {
  filterByEnv?: boolean;
  channelType?: ChannelTypeEnum;
};

export function useGetPrimaryIntegration({ filterByEnv = true, channelType }: UseHasPrimaryIntegrationProps) {
  const isPrimaryStep = useMemo(
    () => channelType === ChannelTypeEnum.EMAIL || channelType === ChannelTypeEnum.SMS,
    [channelType]
  );

  const { activeIntegrationsByEnv, hasActiveIntegration } = useHasActiveIntegrations({
    filterByEnv,
    channelType,
  });

  const getPrimaryIntegration = useMemo(() => {
    if (!hasActiveIntegration || !isPrimaryStep) {
      return undefined;
    }

    return activeIntegrationsByEnv?.find((integration) => integration.primary && integration.channel === channelType)
      ?.providerId;
  }, [hasActiveIntegration, activeIntegrationsByEnv, channelType, isPrimaryStep]);

  return {
    primaryIntegration: getPrimaryIntegration,
    isPrimaryStep,
  };
}
