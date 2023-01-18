import { useEffect, useState } from 'react';
import { Grid } from '@mantine/core';
import { ProviderCard } from './ProviderCard';
import { Title } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { When } from '../../../components/utils/When';
import { IS_DOCKER_HOSTED } from '../../../config';
import { LimitBar } from './LimitBar';

export function ChannelGroup({
  title,
  providers,
  onProviderClick,
  type,
}: {
  providers: IIntegratedProvider[];
  title: string;
  onProviderClick: (visible: boolean, create: boolean, provider: IIntegratedProvider) => void;
  type: ChannelTypeEnum;
}) {
  function handlerOnConnectClick(visible: boolean, create: boolean, provider: IIntegratedProvider) {
    onProviderClick(visible, create, provider);
  }

  return (
    <Grid mb={50}>
      <Grid.Col span={12} data-test-id={`integration-group-${title.toLowerCase()}`}>
        <Title size={2}>{title}</Title>
      </Grid.Col>
      <When truthy={type === ChannelTypeEnum.EMAIL && IS_DOCKER_HOSTED}>
        <Grid.Col sm={12} xs={6} md={4} lg={3}>
          <ProviderCard
            provider={{
              providerId: EmailProviderIdEnum.Novu,
              integrationId: '',
              displayName: 'Novu Email Provider',
              channel: type,
              credentials: [],
              docReference: '',
              comingSoon: false,
              active:
                providers.filter((provider) => provider.active && provider.channel === ChannelTypeEnum.EMAIL).length ===
                0,
              connected: true,
              logoFileName: {
                light: '/static/images/logo-formerly-light-bg.png',
                dark: '/static/images/logo-formerly-dark-bg.png',
              },
              betaVersion: false,
              novu: true,
            }}
            ribbonText="Free Trial"
            onConnectClick={() => {}}
          >
            <LimitBar />
          </ProviderCard>
        </Grid.Col>
      </When>
      {providers.map((provider) => (
        <Grid.Col sm={12} xs={6} md={4} lg={3} key={provider.providerId}>
          <ProviderCard provider={provider} onConnectClick={handlerOnConnectClick} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
