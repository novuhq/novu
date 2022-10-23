import React from 'react';
import styled from '@emotion/styled';
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
  onProviderClick: (visible: boolean, create: boolean, provider: IIntegratedProvider) => void;
}) {
  function handlerOnConnectClick(visible: boolean, create: boolean, provider: IIntegratedProvider) {
    onProviderClick(visible, create, provider);
  }

  return (
    <Wrapper>
      <div data-test-id={`integration-group-${title.toLowerCase()}`}>
        <Title size={2}>{title}</Title>
      </div>
      <ContentWrapper>
        {providers.map((provider) => (
          <div key={provider.providerId}>
            <ProviderCard provider={provider} onConnectClick={handlerOnConnectClick} />
          </div>
        ))}
      </ContentWrapper>
    </Wrapper>
  );
}

const LAYOUT_GAP = 25;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${LAYOUT_GAP}px;
  margin-bottom: 50px;
`;

const ContentWrapper = styled.div`
  --grid-layout-gap: ${LAYOUT_GAP}px;
  --grid-column-count: 4;
  --grid-item--min-width: 205px; /* Provider Card min-width */

  --gap-count: calc(var(--grid-column-count) - 1);
  --total-gap-width: calc(var(--gap-count) * var(--grid-layout-gap));
  --grid-item--max-width: calc((100% - var(--total-gap-width)) / var(--grid-column-count));

  display: grid;
  grid-gap: var(--grid-layout-gap);

  /* 1400px - theme.breakpoints.xs */
  @media screen and (min-width: 1400px) {
    grid-template-columns: repeat(
      auto-fill,
      minmax(max(var(--grid-item--min-width), var(--grid-item--max-width)), 1fr)
    );
  }

  @media screen and (max-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--grid-item--min-width) + var(--grid-layout-gap)), 3fr));
  }
`;
