import { ChannelTypeEnum, EmailProviderIdEnum, InAppProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { useIntegrations } from './integrations';

export function useOnboardingExperiment() {
  const { integrations } = useIntegrations();

  const emailIntegrationOtherThanNovu = integrations?.find(
    (integration) =>
      integration.channel === ChannelTypeEnum.EMAIL && integration.providerId !== EmailProviderIdEnum.Novu
  );

  return {
    isOnboardingExperimentEnabled: !emailIntegrationOtherThanNovu,
  };
}
