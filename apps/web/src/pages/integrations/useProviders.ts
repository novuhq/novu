import { useMemo } from 'react';
import * as cloneDeep from 'lodash.clonedeep';
import {
  ChannelTypeEnum,
  IConfigCredentials,
  IProviderConfig,
  NOVU_SMS_EMAIL_PROVIDERS,
  providers,
  PushProviderIdEnum,
} from '@novu/shared';

import { useIntegrations } from '../../hooks';
import type { IIntegratedProvider, IntegrationEntity } from './types';
import { IS_DOCKER_HOSTED } from '../../config';

/*
 * temporary patch before migration script
 */
function fcmFallback(integration: IntegrationEntity | undefined, clonedCredentials) {
  if (integration?.providerId === PushProviderIdEnum.FCM) {
    const serviceAccount = integration?.credentials.serviceAccount
      ? integration?.credentials.serviceAccount
      : integration?.credentials.user;

    clonedCredentials?.forEach((cred) => {
      if (cred.key === 'serviceAccount') {
        cred.value = serviceAccount;
      }
    });
  }
}

function initializeProvidersByIntegration(integrations: IntegrationEntity[]): IIntegratedProvider[] {
  return integrations
    .filter((integrationItem) => {
      if (!IS_DOCKER_HOSTED) {
        return true;
      }

      return !NOVU_SMS_EMAIL_PROVIDERS.includes(integrationItem.providerId);
    })
    .map((integrationItem) => {
      const providerItem = providers.find((provItem) => integrationItem.providerId === provItem.id) as IProviderConfig;

      const clonedCredentials: IConfigCredentials[] = cloneDeep(providerItem?.credentials);

      if (
        typeof clonedCredentials === 'object' &&
        integrationItem?.credentials &&
        Object.keys(clonedCredentials).length !== 0
      ) {
        clonedCredentials.forEach((credential) => {
          if (credential.type === 'boolean' || credential.type === 'switch') {
            credential.value = integrationItem.credentials[credential.key];

            return;
          }

          // eslint-disable-next-line
          credential.value = integrationItem.credentials[credential.key]?.toString();
        });
      }

      // Remove this like after the run of the fcm-credentials-migration script
      fcmFallback(integrationItem, clonedCredentials);

      const hasCredentials = integrationItem?.credentials && Object.keys(integrationItem?.credentials).length !== 0;

      return {
        providerId: providerItem?.id || integrationItem.providerId,
        integrationId: integrationItem?._id ? integrationItem._id : '',
        displayName: providerItem?.displayName || integrationItem.name,
        channel: providerItem?.channel || integrationItem.channel,
        hasCredentials,
        credentials: (integrationItem?.credentials ? clonedCredentials : providerItem?.credentials) || [],
        docReference: providerItem?.docReference || '',
        comingSoon: !!providerItem?.comingSoon,
        betaVersion: !!providerItem?.betaVersion,
        active: integrationItem?.active ?? false,
        connected: !!integrationItem,
        logoFileName: providerItem?.logoFileName,
        environmentId: integrationItem?._environmentId,
        name: integrationItem?.name,
        identifier: integrationItem?.identifier,
        primary: integrationItem?.primary ?? false,
        conditions: integrationItem?.conditions ?? [],
      };
    });
}

function isConnected(provider: IIntegratedProvider) {
  if (!provider.credentials.length) return false;

  return provider.credentials?.some((cred) => {
    return cred.value;
  });
}

const sortProviders = (unsortedProviders: IIntegratedProvider[]) => {
  return unsortedProviders
    .sort((a, b) => Number(b.active) - Number(a.active))
    .sort((a, b) => Number(isConnected(b)) - Number(isConnected(a)));
};

export const useProviders = () => {
  const { integrations, loading: isLoading, refetch } = useIntegrations();

  const sortedProviders = useMemo(() => {
    if (integrations) {
      const initializedProviders = initializeProvidersByIntegration(integrations);

      return {
        emailProviders: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.EMAIL)
        ),
        smsProvider: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.SMS)
        ),
        chatProvider: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.CHAT)
        ),
        pushProvider: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.PUSH)
        ),
        inAppProvider: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.IN_APP)
        ),
        providers: initializedProviders,
      };
    }

    return {
      emailProviders: [],
      smsProvider: [],
      chatProvider: [],
      pushProvider: [],
      inAppProvider: [],
      providers: [],
    };
  }, [integrations]);

  return {
    ...sortedProviders,
    isLoading,
    refetch,
  };
};
