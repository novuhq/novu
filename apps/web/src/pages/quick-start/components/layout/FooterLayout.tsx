import React from 'react';
import { Grid } from '@mantine/core';
import styled from '@emotion/styled';

interface IFooterLayoutProps {
  leftSide: React.ReactNode;
  rightSide: React.ReactNode;
}

export function FooterLayout({ leftSide, rightSide }: IFooterLayoutProps) {
  return (
    <FooterWrapper>
      <Grid justify="space-between" style={{ width: '100%', padding: '0 80px' }} gutter={0}>
        <Grid.Col span={4}>
          <LeftSide>{leftSide}</LeftSide>
        </Grid.Col>
        <Grid.Col span={4}>
          <MiddleSide> .. </MiddleSide>
        </Grid.Col>
        <Grid.Col span={4}>
          <RightSide>{rightSide}</RightSide>
        </Grid.Col>
      </Grid>
    </FooterWrapper>
  );
}

const LeftSide = styled.div``;

const MiddleSide = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const RightSide = styled.div`
  display: flex;
  justify-content: end;
`;

const FooterWrapper = styled.div`
  height: 150px;

  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
`;
