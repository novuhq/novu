import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';

import { useIntegrations } from './integrations';
import { IS_DOCKER_HOSTED } from '../config';

export function useOnboardingExperiment() {
  const { integrations } = useIntegrations();

  const emailIntegrationOtherThanNovu = integrations?.find(
    (integration) =>
      integration.channel === ChannelTypeEnum.EMAIL && integration.providerId !== EmailProviderIdEnum.Novu
  );

  return {
    isOnboardingExperimentEnabled: !emailIntegrationOtherThanNovu && !IS_DOCKER_HOSTED,
  };
}
