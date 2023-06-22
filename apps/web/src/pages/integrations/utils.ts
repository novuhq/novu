import { IEnvironment, providers } from '@novu/shared';

import { IntegrationEntity } from './IntegrationsStorePage';
import { CONTEXT_PATH } from '../../config';
import { CHANNEL_TYPE_TO_STRING } from '../../utils/channels';

export const mapToTableIntegration = (integration: IntegrationEntity, environments?: IEnvironment[]) => {
  const provider = providers.find((el) => el.id === integration.providerId);
  const logoFileName = provider?.logoFileName
    ? {
        light: `${CONTEXT_PATH}/static/images/providers/light/${provider.logoFileName.light}`,
        dark: `${CONTEXT_PATH}/static/images/providers/dark/${provider.logoFileName.dark}`,
      }
    : {
        light: `${CONTEXT_PATH}/static/images/logo.png`,
        dark: `${CONTEXT_PATH}/static/images/logo-light.png`,
      };
  const environment = environments?.find((env) => env._id === integration._environmentId);

  return {
    name: `${integration.providerId.charAt(0).toUpperCase()}${integration.providerId.slice(1)}`,
    // TODO: change to identyficator when it will be available
    identyficator: integration._id ?? '',
    provider: `${integration.providerId.charAt(0).toUpperCase()}${integration.providerId.slice(1)}`,
    channel: CHANNEL_TYPE_TO_STRING[integration.channel],
    channelType: integration.channel,
    environment: environment?.name ?? '',
    active: integration.active,
    logoFileName,
  };
};
