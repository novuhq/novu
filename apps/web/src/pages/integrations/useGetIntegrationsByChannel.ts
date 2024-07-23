import { ChannelTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useEnvironment, useIntegrations } from '../../hooks';

export interface IUseGetIntegrationsByChannelProps {
  channelType: ChannelTypeEnum;
}

/**
 * Fetch the integrations for a specified channel type in the current environment.
 */
export const useGetIntegrationsByChannel = ({ channelType }: IUseGetIntegrationsByChannelProps) => {
  const { environment, isLoaded } = useEnvironment();
  const { integrations: allIntegrations, loading: areIntegrationsLoading } = useIntegrations();
  const isLoading = !isLoaded || areIntegrationsLoading;

  const integrations = useMemo(() => {
    if (isLoading || !environment || !allIntegrations) {
      return [];
    }

    return allIntegrations.filter(
      (integration) => integration.channel === channelType && integration._environmentId === environment._id
    );
  }, [allIntegrations, isLoading, environment, channelType]);

  return {
    isLoading,
    integrations,
  };
};
