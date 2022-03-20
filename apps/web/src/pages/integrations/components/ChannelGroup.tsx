import React from 'react';
import { Grid } from '@mantine/core';
import { ProviderCard } from './ProviderCard';
import { Title } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';

export function ChannelGroup({
  title,
  providers,
  showModalData,
}: {
  providers: IIntegratedProvider[];
  title: string;
  showModalData: (visible: boolean, createIntegrationModal: boolean, provider: IIntegratedProvider) => void;
}) {
  function showModal(visible: boolean, create: boolean, provider: IIntegratedProvider) {
    showModalData(visible, create, provider);
  }

  return (
    <Grid mb={50}>
      <Grid.Col span={12}>
        <Title size={2}>{title}</Title>
      </Grid.Col>
      {providers.map((provider) => (
        <Grid.Col span={3} key={provider.providerId}>
          <ProviderCard provider={provider} showModal={showModal} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
