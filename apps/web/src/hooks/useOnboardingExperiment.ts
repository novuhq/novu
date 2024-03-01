import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';

import { useIntegrations } from './integrations';
import { IS_DOCKER_HOSTED } from '../config';

export function useOnboardingExperiment() {
  const { integrations, loading: areIntegrationsLoading } = useIntegrations();

  const emailIntegrationOtherThanNovu = integrations?.find(
    (integration) =>
      integration.channel === ChannelTypeEnum.EMAIL && integration.providerId !== EmailProviderIdEnum.Novu
  );

  return {
    isOnboardingExperimentEnabled: !areIntegrationsLoading && !emailIntegrationOtherThanNovu && !IS_DOCKER_HOSTED,
  };
}
