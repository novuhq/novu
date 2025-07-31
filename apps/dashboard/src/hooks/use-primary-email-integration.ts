import { ChannelTypeEnum, IIntegration } from '@novu/shared';
import { useMemo } from 'react';
import { useFetchIntegrations } from './use-fetch-integrations';

type PrimaryEmailIntegrationResult = {
  senderEmail?: string;
  senderName?: string;
  integration?: IIntegration;
  isLoading: boolean;
};

export function usePrimaryEmailIntegration(): PrimaryEmailIntegrationResult {
  const { integrations, isLoading } = useFetchIntegrations();

  const primaryEmailIntegration = useMemo(() => {
    if (!integrations) return undefined;

    return integrations.find(
      (integration) => integration.channel === ChannelTypeEnum.EMAIL && integration.active && integration.primary
    );
  }, [integrations]);

  return {
    senderEmail: primaryEmailIntegration?.credentials?.from,
    senderName: primaryEmailIntegration?.credentials?.senderName,
    integration: primaryEmailIntegration,
    isLoading,
  };
}
