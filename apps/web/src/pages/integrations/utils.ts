import { IEnvironment, providers } from '@novu/shared';

import type { IntegrationEntity } from './types';
import { CONTEXT_PATH } from '../../config';
import { CHANNEL_TYPE_TO_STRING } from '../../utils/channels';
import type { ITableIntegration } from './types';

export const mapToTableIntegration = (
  integration: IntegrationEntity,
  environments?: IEnvironment[]
): ITableIntegration => {
  const logoFileName = {
    light: `${CONTEXT_PATH}/static/images/providers/light/square/${integration.providerId}.svg`,
    dark: `${CONTEXT_PATH}/static/images/providers/dark/square/${integration.providerId}.svg`,
  };
  const environment = environments?.find((env) => env._id === integration._environmentId);
  const provider = providers.find((el) => el.id === integration.providerId);

  return {
    name: integration.name ?? provider?.displayName,
    isPrimary: integration.isPrimary,
    order: integration.order,
    integrationId: integration._id ?? '',
    identifier: integration.identifier,
    provider: provider?.displayName ?? '',
    channel: CHANNEL_TYPE_TO_STRING[integration.channel],
    channelType: integration.channel,
    environment: environment?.name ?? '',
    active: integration.active,
    logoFileName,
    providerId: integration.providerId,
  };
};

export const findPrimaryIntegration = <T extends { order: number }>(integrations: T[]): T => {
  const sortedIntegrations = [...integrations].sort((a, b) => a.order - b.order);
  const [primaryIntegration] = sortedIntegrations;

  return primaryIntegration;
};
