import React from 'react';
import styled from 'styled-components';
import { FeedsTabs } from './FeedsTabs';
import { ITab } from '../../../index';

export function Main() {
  return (
    <MainWrapper data-test-id="main-wrapper">
      <FeedsTabs />
    </MainWrapper>
  );
}

const MainWrapper = styled.div``;
