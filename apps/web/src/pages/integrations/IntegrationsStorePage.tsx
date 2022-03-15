import React from 'react';
import styled from '@emotion/styled';
import { ChannelTypeEnum, providers } from '@notifire/shared';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { ChannelGroup } from './components/ChannelGroup';

export function IntegrationsStore() {
  const emailProviders = providers.filter((provider) => provider.channel === ChannelTypeEnum.EMAIL);
  const smsProvider = providers.filter((provider) => provider.channel === ChannelTypeEnum.SMS);

  return (
    <PageContainer>
      <PageHeader title="Integration Store" />

      <ContentWrapper>
        <ChannelGroup providers={emailProviders} title="Email" />
        <ChannelGroup providers={smsProvider} title="SMS" />
      </ContentWrapper>
    </PageContainer>
  );
}

const ContentWrapper = styled.div`
  padding: 0 30px;
`;
