import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { ChannelTypeEnum, providers, IConfigCredentials, ILogoFileName } from '@novu/shared';
import { Modal } from '@mantine/core';
import * as cloneDeep from 'lodash.clonedeep';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { ChannelGroup } from './components/ChannelGroup';
import { ConnectIntegrationForm } from './components/ConnectIntegrationForm';
import { useIntegrations } from '../../api/hooks';

export function IntegrationsStore() {
  const { integrations, loading: isLoading, refetch } = useIntegrations();
  const [emailProviders, setEmailProviders] = useState<IIntegratedProvider[]>([]);
  const [smsProvider, setSmsProvider] = useState<IIntegratedProvider[]>([]);
  const [isModalOpened, setModalIsOpened] = useState(false);
  const [isCreateIntegrationModal, setIsCreateIntegrationModal] = useState(false);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);

  async function handlerVisible(visible: boolean, createIntegrationModal: boolean, providerConfig: any) {
    setModalIsOpened(visible);
    setProvider(providerConfig);
    setIsCreateIntegrationModal(createIntegrationModal);
  }

  async function handlerShowModal(showModal: boolean) {
    await setModalIsOpened(showModal);
    if (!showModal) {
      await refetch();
    }
  }

  useEffect(() => {
    if (integrations) {
      const initializedProviders: IIntegratedProvider[] = providers.map((providerItem) => {
        const integration = integrations.find((integrationItem) => integrationItem.providerId === providerItem.id);

        const mappedCredentials = cloneDeep(providerItem.credentials);
        if (integration?.credentials) {
          mappedCredentials.forEach((credential) => {
            // eslint-disable-next-line no-param-reassign
            credential.value = integration.credentials[credential.key]?.toString();
          });
        }

        return {
          providerId: providerItem.id,
          integrationId: integration?._id ? integration._id : '',
          displayName: providerItem.displayName,
          channel: providerItem.channel,
          credentials: integration?.credentials ? mappedCredentials : providerItem.credentials,
          docReference: providerItem.docReference,
          comingSoon: !!providerItem.comingSoon,
          active: integration?.active ?? true,
          connected: !!integration,
          logoFileName: providerItem.logoFileName,
        };
      });

      setEmailProviders(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.EMAIL))
      );
      setSmsProvider(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.SMS))
      );
    }
  }, [integrations]);

  return (
    <>
      <PageMeta title="Integrations" />
      {!isLoading ? (
        <PageContainer>
          <PageHeader title="Integration Store" />

          <Modal
            withCloseButton={false}
            centered
            size="lg"
            overflow="inside"
            opened={isModalOpened}
            onClose={() => setModalIsOpened(false)}
          >
            <ConnectIntegrationForm
              onClose={() => setModalIsOpened(false)}
              provider={provider}
              showModal={handlerShowModal}
              createModel={isCreateIntegrationModal}
            />
          </Modal>

          <ContentWrapper>
            <ChannelGroup providers={emailProviders} title="Email" onProviderClick={handlerVisible} />
            <ChannelGroup providers={smsProvider} title="SMS" onProviderClick={handlerVisible} />
          </ContentWrapper>
        </PageContainer>
      ) : null}
    </>
  );
}

const ContentWrapper = styled.div`
  padding: 0 30px;
`;

const sortProviders = (unsortedProviders: IIntegratedProvider[]) => {
  return unsortedProviders
    .sort((a, b) => Number(b.active) - Number(a.active))
    .sort((a, b) => Number(isConnected(b)) - Number(isConnected(a)));
};

function isConnected(provider: IIntegratedProvider) {
  return provider.credentials.some((cred) => {
    return cred.value;
  });
}

export interface IIntegratedProvider {
  providerId: string;
  integrationId: string;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: IConfigCredentials[];
  docReference: string;
  comingSoon: boolean;
  active: boolean;
  connected: boolean;
  logoFileName: ILogoFileName;
}
