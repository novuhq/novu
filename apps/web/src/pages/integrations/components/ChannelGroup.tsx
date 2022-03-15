import React from 'react';
import { Grid } from '@mantine/core';
import { ProviderCard } from './ProviderCard';
import { Title } from '../../../design-system';

export function ChannelGroup({ title, providers }: { providers: any[]; title: string }) {
  return (
    <Grid mb={50}>
      <Grid.Col span={12}>
        <Title size={2}>{title}</Title>
      </Grid.Col>
      {providers.map((provider) => (
        <Grid.Col span={3} key={provider.id}>
          <ProviderCard provider={provider} connected active={false} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
