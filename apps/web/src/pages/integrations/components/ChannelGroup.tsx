import React from 'react';
import { Grid } from '@mantine/core';
import { IProviderConfig } from '@notifire/shared';
import { ProviderCard } from './ProviderCard';
import { Title } from '../../../design-system';

export function ChannelGroup({
  title,
  providers,
  showModalData,
}: {
  providers: any[];
  title: string;
  showModalData: (visible: boolean, provider: IProviderConfig) => void;
}) {
  function showModal(visible: boolean, provider: IProviderConfig) {
    showModalData(visible, provider);
  }

  return (
    <Grid mb={50}>
      <Grid.Col span={12}>
        <Title size={2}>{title}</Title>
      </Grid.Col>
      {providers.map((provider) => (
        <Grid.Col span={3} key={provider.id}>
          <ProviderCard provider={provider} connected active={false} showModal={showModal} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
