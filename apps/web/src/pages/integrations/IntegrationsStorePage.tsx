import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { ChannelTypeEnum, providers, IConfigCredentials } from '@notifire/shared';
import { Modal } from '@mantine/core';
import * as cloneDeep from 'lodash.clonedeep';
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
      const initializedProviders: IIntegratedProvider[] = providers.map((x) => {
        const integration = integrations.find((y) => y.providerId === x.id);

        const mappedCredentials = cloneDeep(x.credentials);
        if (integration?.credentials) {
          mappedCredentials.forEach((c) => {
            // eslint-disable-next-line no-param-reassign
            c.value = integration.credentials[c.key]?.toString();
          });
        }

        return {
          providerId: x.id,
          integrationId: integration?._id ? integration._id : '',
          displayName: x.displayName,
          channel: x.channel,
          credentials: integration?.credentials ? mappedCredentials : x.credentials,
          docReference: x.docReference,
          comingSoon: !!x.comingSoon,
          active: integration?.active ? integration.active : false,
          connected: !!integration,
        };
      });

      setEmailProviders(sortProviders(initializedProviders.filter((p) => p.channel === ChannelTypeEnum.EMAIL)));
      setSmsProvider(sortProviders(initializedProviders.filter((p) => p.channel === ChannelTypeEnum.SMS)));
    }
  }, [integrations]);

  return (
    <PageContainer>
      <PageHeader title="Integration Store" />

      <Modal
        hideCloseButton
        centered
        size="lg"
        overflow="inside"
        opened={isModalOpened}
        onClose={() => setModalIsOpened(false)}>
        <ConnectIntegrationForm
          onClose={() => setModalIsOpened(false)}
          provider={provider}
          showModal={handlerShowModal}
          createModel={isCreateIntegrationModal}
        />
      </Modal>

      <ContentWrapper isLoading={isLoading}>
        <ChannelGroup providers={emailProviders} title="Email" onProviderClick={handlerVisible} />
        <ChannelGroup providers={smsProvider} title="SMS" onProviderClick={handlerVisible} />
      </ContentWrapper>
    </PageContainer>
  );
}

const ContentWrapper = styled.div<{ isLoading: boolean }>`
  padding: 0 30px;
`;

const sortProviders = (unsortedProviders: IIntegratedProvider[]) => {
  return unsortedProviders
    .sort((x, y) => Number(!x.connected) - Number(!y.connected))
    .sort((a, b) => Number(!a.active) - Number(!b.active));
};

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
}
