import React from 'react';
import styled from 'styled-components';
import { FeedsTabs } from './FeedsTabs';

export function Main({ tabs }: { tabs?: { name: string; query?: { feedId: string | string[] } }[] }) {
  return (
    <MainWrapper data-test-id="main-wrapper">
      <FeedsTabs tabs={tabs} />
    </MainWrapper>
  );
}

const MainWrapper = styled.div``;
