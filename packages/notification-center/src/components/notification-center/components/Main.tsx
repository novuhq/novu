import React from 'react';
import styled from 'styled-components';
import { FeedsTabs } from './FeedsTabs';

export function Main() {
  return (
    <MainWrapper data-test-id="main-wrapper">
      <FeedsTabs />
    </MainWrapper>
  );
}

const MainWrapper = styled.div``;
