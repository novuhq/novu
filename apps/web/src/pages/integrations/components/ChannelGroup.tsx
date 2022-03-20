import React from 'react';
import { Grid } from '@mantine/core';
import { IProviderConfig } from '@notifire/shared';
import { ProviderCard } from './ProviderCard';
import { Title } from '../../../design-system';

export function ChannelGroup({
  title,
  providers,
  onProviderClick,
}: {
  providers: any[];
  title: string;
  onProviderClick: (visible: boolean, provider: IProviderConfig) => void;
}) {
  function handlerOnConnectClick(visible: boolean, provider: IProviderConfig) {
    onProviderClick(visible, provider);
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
