import React from 'react';
import { Grid } from '@mantine/core';
import { ProviderCard } from './ProviderCard';
import { Title } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';

export function ChannelGroup({
  title,
  providers,
  onProviderClick,
}: {
  providers: IIntegratedProvider[];
  title: string;
  onProviderClick: (visible: boolean, provider: IIntegratedProvider) => void;
}) {
  function handlerOnConnectClick(visible: boolean,create: boolean, provider: IIntegratedProvider) {
    onProviderClick(visible,create, provider);
  }

  return (
    <Grid mb={50}>
      <Grid.Col span={12}>
        <Title size={2}>{title}</Title>
      </Grid.Col>
      {providers.map((provider) => (
        <Grid.Col span={3} key={provider.id}>
          <ProviderCard provider={provider} connected active={false} onConnectClick={handlerOnConnectClick} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
