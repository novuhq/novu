import React from 'react';
import { Grid } from '@mantine/core';
import { ProviderCard } from './ProviderCard';
import { Title } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';

import styled from 'styled-components';

export function ChannelGroup({
  title,
  providers,
  onProviderClick,
}: {
  providers: IIntegratedProvider[];
  title: string;
  onProviderClick: (visible: boolean, create: boolean, provider: IIntegratedProvider) => void;
}) {
  function handlerOnConnectClick(visible: boolean, create: boolean, provider: IIntegratedProvider) {
    onProviderClick(visible, create, provider);
  }

  return (
    /*
     * <Grid mb={50}>
     *   <Grid.Col span={12} data-test-id={`integration-group-${title.toLowerCase()}`}>
     *     <Title size={2}>{title}</Title>
     *   </Grid.Col>
     *   {providers.map((provider) => (
     *     <Grid.Col sm={12} xs={6} md={4} lg={3} key={provider.providerId}>
     *       <ProviderCard provider={provider} onConnectClick={handlerOnConnectClick} />
     *     </Grid.Col>
     *   ))}
     * </Grid>
     */
    <div
      style={{
        marginBottom: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 25,
      }}
    >
      <Title size={2}>{title}</Title>
      <ContentWrapper>
        {providers.map((provider) => (
          <div key={provider.providerId}>
            <ProviderCard provider={provider} onConnectClick={handlerOnConnectClick} />
          </div>
        ))}
      </ContentWrapper>
    </div>
  );
}

const ContentWrapper = styled.div`
  --grid-layout-gap: 20px;
  --grid-column-count: 4;
  --grid-item--min-width: 100px;

  /**
   * Calculated values.
   */
  --gap-count: calc(var(--grid-column-count) - 1);
  --total-gap-width: calc(var(--gap-count) * var(--grid-layout-gap));
  --grid-item--max-width: calc((100% - var(--total-gap-width)) / var(--grid-column-count));

  display: grid;

  @media screen and (min-width: 1400px) {
    grid-template-columns: repeat(
      auto-fill,
      minmax(max(var(--grid-item--min-width), var(--grid-item--max-width)), 1fr)
    );
    grid-gap: var(--grid-layout-gap);
  }

  @media screen and (max-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 3fr));
    grid-gap: 20px;
  }
`;

{
  /*
   * <div
   *  style={{
   *    marginBottom: 50,
   *  }}
   * >
   *  <h1>{title}</h1>
   *  <div
   *    style={{
   *      display: 'grid',
   *      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
   *      gridGap: 20,
   *    }}
   *  >
   *    {providers.map((provider) => (
   *      <div key={provider.providerId}>
   *        <ProviderCard provider={provider} onConnectClick={handlerOnConnectClick} />
   *      </div>
   *    ))}
   *  </div>
   * </div>
   */
}
