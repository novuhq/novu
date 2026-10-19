import { ChannelTypeEnum, IIntegration } from '@novu/shared';
import { useMemo } from 'react';
import { useEnvironment } from '../context/environment/hooks';
import { useFetchIntegrations } from './use-fetch-integrations';

type PrimaryEmailIntegrationResult = {
  senderEmail?: string;
  senderName?: string;
  integration?: IIntegration;
  isLoading: boolean;
};

export function usePrimaryEmailIntegration(): PrimaryEmailIntegrationResult {
  const { currentEnvironment } = useEnvironment();
  const { integrations, isLoading } = useFetchIntegrations();

  const primaryEmailIntegration = useMemo(() => {
    if (!integrations) return undefined;

    return integrations.find(
      (integration) =>
        integration._environmentId === currentEnvironment?._id &&
        integration.channel === ChannelTypeEnum.EMAIL &&
        integration.active &&
        integration.primary
    );
  }, [integrations, currentEnvironment?._id]);

  return {
    senderEmail: primaryEmailIntegration?.credentials?.from,
    senderName: primaryEmailIntegration?.credentials?.senderName,
    integration: primaryEmailIntegration,
    isLoading,
  };
}
