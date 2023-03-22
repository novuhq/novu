import { useMemo } from 'react';
import * as cloneDeep from 'lodash.clonedeep';
import { ChannelTypeEnum, providers, PushProviderIdEnum } from '@novu/shared';

import { useIntegrations } from '../../hooks';
import { IIntegratedProvider, IntegrationEntity } from './IntegrationsStorePage';

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

function initializeProviders(integrations: IntegrationEntity[]): IIntegratedProvider[] {
  return providers.map((providerItem) => {
    const integration = integrations.find((integrationItem) => integrationItem.providerId === providerItem.id);

    const clonedCredentials = cloneDeep(providerItem.credentials);

    if (integration?.credentials && Object.keys(clonedCredentials).length !== 0) {
      clonedCredentials.forEach((credential) => {
        // eslint-disable-next-line no-param-reassign
        credential.value = integration.credentials[credential.key]?.toString();
      });
    }

    // Remove this like after the run of the fcm-credentials-migration script
    fcmFallback(integration, clonedCredentials);

    return {
      providerId: providerItem.id,
      integrationId: integration?._id ? integration._id : '',
      displayName: providerItem.displayName,
      channel: providerItem.channel,
      credentials: integration?.credentials ? clonedCredentials : providerItem.credentials,
      docReference: providerItem.docReference,
      comingSoon: !!providerItem.comingSoon,
      betaVersion: !!providerItem.betaVersion,
      active: integration?.active ?? false,
      connected: !!integration,
      logoFileName: providerItem.logoFileName,
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
  const { integrations } = useIntegrations({ refetchOnMount: false });

  return useMemo(() => {
    if (integrations) {
      const initializedProviders = initializeProviders(integrations);

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
      };
    }

    return {
      emailProviders: [],
      smsProvider: [],
      chatProvider: [],
      pushProvider: [],
    };
  }, [integrations]);
};
