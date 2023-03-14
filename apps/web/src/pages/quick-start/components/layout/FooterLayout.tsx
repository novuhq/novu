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
        <Grid.Col span={4} style={{ display: 'flex', alignItems: 'center' }}>
          <LeftSide>{leftSide}</LeftSide>
        </Grid.Col>
        <Grid.Col span={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  box-shadow: inset 0 1px 0 #000000;

  ${({ theme }) => {
    return (
      theme.colorScheme === 'dark' &&
      `
      box-shadow: inset 0 1px 0px #000000;
      `
    );
  }};

  ${({ theme }) =>
    theme.colorScheme === 'dark'
      ? `
           box-shadow: inset 0 1px 0px #000000;
          `
      : `
           box-shadow: inset 0px 1px 0px rgba(0, 0, 0, 0.2);
          `};
`;
