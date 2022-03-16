import React, { useState } from 'react';
import styled from '@emotion/styled';
import { ChannelTypeEnum, IProviderConfig, providers } from '@notifire/shared';
import { Modal, useMantineColorScheme, Image } from '@mantine/core';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { ChannelGroup } from './components/ChannelGroup';
import { ConnectIntegrationForm } from './components/ConnectIntegrationForm';

export function IntegrationsStore() {
  const emailProviders = providers.filter((provider) => provider.channel === ChannelTypeEnum.EMAIL);
  const smsProvider = providers.filter((provider) => provider.channel === ChannelTypeEnum.SMS);

  const [isOpened, setIsOpened] = useState(false);
  const [provider, setProvider] = useState<IProviderConfig | null>(null);

  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const logoSrc = provider ? `/static/images/providers/${isDark ? 'light' : 'light'}/${provider.id}.png` : '';

  function handlerVisible(visible: boolean, providerConfig: IProviderConfig) {
    setIsOpened(visible);
    setProvider(providerConfig);
  }

  return (
    <PageContainer>
      <PageHeader title="Integration Store" />

      <Modal centered size="lg" overflow="inside" opened={isOpened} onClose={() => setIsOpened(false)}>
        <Image radius="md" src={logoSrc} alt={`${provider?.id} image`} />
        <ConnectIntegrationForm provider={provider} />
      </Modal>

      <ContentWrapper>
        <ChannelGroup providers={emailProviders} title="Email" showModalData={handlerVisible} />
        <ChannelGroup providers={smsProvider} title="SMS" showModalData={handlerVisible} />
      </ContentWrapper>
    </PageContainer>
  );
}

const ContentWrapper = styled.div`
  padding: 0 30px;
`;
