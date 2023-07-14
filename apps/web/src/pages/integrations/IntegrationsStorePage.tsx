import { useState } from 'react';
import styled from '@emotion/styled';
import { Modal } from '@mantine/core';
import * as cloneDeep from 'lodash.clonedeep';
import {
  ChannelTypeEnum,
  IConfigCredentials,
  ILogoFileName,
  providers,
  PushProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  ProvidersIdEnum,
  SmsProviderIdEnum,
  ICredentials,
} from '@novu/shared';

import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { ChannelGroup } from './components/ChannelGroup';
import { ConnectIntegrationForm } from './components/ConnectIntegrationForm';
import { When } from '../../components/utils/When';
import { NovuEmailProviderModal } from './components/NovuEmailProviderModal';
import { NovuInAppProviderModal } from './components/NovuInAppProviderModal';
import { useProviders } from './useProviders';
import { NovuSmsProviderModal } from './components/NovuSmsProviderModal';
import { useCreateInAppIntegration } from '../../hooks/useCreateInAppIntegration';
import { LoadingOverlay } from '../../design-system';

export function IntegrationsStore() {
  const { emailProviders, smsProvider, chatProvider, pushProvider, inAppProvider, isLoading, refetch } = useProviders();
  const [isModalOpened, setModalIsOpened] = useState(false);
  const [isCreateIntegrationModal, setIsCreateIntegrationModal] = useState(false);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);
  const { create } = useCreateInAppIntegration((data: any) => {
    setProvider({
      ...(provider as IIntegratedProvider),
      integrationId: data._id,
      active: data.active,
    });
  });

  async function handlerVisible(
    visible: boolean,
    createIntegrationModal: boolean,
    providerConfig: IIntegratedProvider
  ) {
    setModalIsOpened(visible);
    if (providerConfig.providerId === InAppProviderIdEnum.Novu && providerConfig.channel === ChannelTypeEnum.IN_APP) {
      create();
    }
    setProvider(providerConfig);
    setIsCreateIntegrationModal(createIntegrationModal);
  }

  async function handlerShowModal(showModal: boolean) {
    await setModalIsOpened(showModal);
    if (!showModal) {
      await refetch();
    }
  }

  return (
    <PageContainer title="Integrations">
      <PageHeader title="Integration Store" />
      <LoadingOverlay visible={isLoading}>
        <When truthy={!isLoading}>
          <Modal
            withCloseButton={false}
            centered
            size={provider?.providerId === InAppProviderIdEnum.Novu ? 1000 : 'lg'}
            overflow="inside"
            opened={isModalOpened}
            onClose={() => setModalIsOpened(false)}
          >
            <When truthy={provider && !provider?.novu && provider?.providerId !== InAppProviderIdEnum.Novu}>
              <ConnectIntegrationForm
                onClose={() => setModalIsOpened(false)}
                provider={provider as IIntegratedProvider}
                showModal={handlerShowModal}
                createModel={isCreateIntegrationModal}
              />
            </When>
            <When truthy={provider?.providerId === EmailProviderIdEnum.Novu}>
              <NovuEmailProviderModal onClose={() => setModalIsOpened(false)} />
            </When>
            <When truthy={provider?.providerId === InAppProviderIdEnum.Novu}>
              <NovuInAppProviderModal
                showModal={handlerShowModal}
                provider={provider}
                onClose={() => setModalIsOpened(false)}
              />
            </When>
            <When truthy={provider?.providerId === SmsProviderIdEnum.Novu}>
              <NovuSmsProviderModal onClose={() => setModalIsOpened(false)} />
            </When>
          </Modal>

          <ContentWrapper>
            <ChannelGroup
              channel={ChannelTypeEnum.IN_APP}
              providers={inAppProvider}
              title="In-App"
              onProviderClick={handlerVisible}
            />
            <ChannelGroup
              channel={ChannelTypeEnum.EMAIL}
              providers={emailProviders}
              title="Email"
              onProviderClick={handlerVisible}
            />
            <ChannelGroup
              channel={ChannelTypeEnum.SMS}
              providers={smsProvider}
              title="SMS"
              onProviderClick={handlerVisible}
            />
            <ChannelGroup
              channel={ChannelTypeEnum.CHAT}
              providers={chatProvider}
              title="Chat"
              onProviderClick={handlerVisible}
            />
            <ChannelGroup
              channel={ChannelTypeEnum.PUSH}
              providers={pushProvider}
              title="Push"
              onProviderClick={handlerVisible}
            />
          </ContentWrapper>
        </When>
      </LoadingOverlay>
    </PageContainer>
  );
}

const ContentWrapper = styled.div`
  padding: 0 30px;
`;

export interface IIntegratedProvider {
  providerId: ProvidersIdEnum;
  integrationId: string;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: IConfigCredentials[];
  docReference: string;
  comingSoon: boolean;
  active: boolean;
  connected: boolean;
  logoFileName: ILogoFileName;
  betaVersion: boolean;
  novu?: boolean;
  environmentId?: string;
  name?: string;
  identifier?: string;
}

export interface IntegrationEntity {
  _id?: string;

  _environmentId: string;

  _organizationId: string;

  name: string;

  identifier: string;

  providerId: ProvidersIdEnum;

  channel: ChannelTypeEnum;

  credentials: ICredentials;

  active: boolean;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;
}

function initializeProviders(integrations: IntegrationEntity[]): IIntegratedProvider[] {
  return providers.map((providerItem) => {
    const integration = integrations.find((integrationItem) => integrationItem.providerId === providerItem.id);

    const clonedCredentials = cloneDeep(providerItem.credentials);

    if (integration?.credentials && Object.keys(clonedCredentials).length !== 0) {
      clonedCredentials.forEach((credential) => {
        // eslint-disable-next-line no-param-reassign
        if (credential.type === 'object' && integration.credentials[credential.key]) {
          credential.value = JSON.stringify(integration.credentials[credential.key]);
        } else if (credential.type === 'switch') {
          credential.value = integration.credentials[credential.key];
        } else {
          credential.value = integration.credentials[credential.key]?.toString();
        }
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
