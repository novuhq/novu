import { useState } from 'react';
import styled from '@emotion/styled';
import { Modal } from '@mantine/core';
import { ChannelTypeEnum, EmailProviderIdEnum, InAppProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

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
import type { IIntegratedProvider } from './types';

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
