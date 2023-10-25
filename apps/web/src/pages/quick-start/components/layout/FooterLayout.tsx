import React, { useEffect } from 'react';
import styled from '@emotion/styled';

import { colors, DotsNavigation } from '@novu/design-system';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../../constants/routes.enum';
import { Grid } from '@mantine/core';

interface IFooterLayoutProps {
  leftSide: React.ReactNode;
  rightSide: React.ReactNode;
}
export const FOOTER_HEIGHT = 80;
export function FooterLayout({ leftSide, rightSide }: IFooterLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = React.useState(location.pathname === ROUTES.GET_STARTED ? 0 : 1);

  const handleOnNavigationClick = (index: number) => {
    setSelectedIndex(index);
    navigate(index === 0 ? ROUTES.GET_STARTED : ROUTES.GET_STARTED_PREVIEW);
  };

  useEffect(() => {
    if (location.pathname === ROUTES.GET_STARTED) {
      setSelectedIndex(0);
    } else if (location.pathname === ROUTES.GET_STARTED_PREVIEW) {
      setSelectedIndex(1);
    }
  }, [location]);

  return (
    <FooterWrapper>
      <Grid justify={'space-between'} style={{ width: '100%' }} m={0} mx={12}>
        <LeftCol span={4}>{leftSide} </LeftCol>
        <MiddleCol span={4}>
          <DotsNavigation selectedIndex={selectedIndex} size={2} onClick={handleOnNavigationClick} />
        </MiddleCol>
        <RightCol span={4}>{rightSide} </RightCol>
      </Grid>
    </FooterWrapper>
  );
}

const LeftCol = styled(Grid.Col)`
  display: flex;
  justify-content: flex-start;
  justify-items: center;
  align-items: center;
`;

const MiddleCol = styled(Grid.Col)`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const RightCol = styled(Grid.Col)`
  display: flex;
  justify-items: center;
  justify-content: end;
  align-items: center;
`;

const FooterWrapper = styled.div`
  width: 100%;
  height: ${FOOTER_HEIGHT}px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  box-shadow: inset 0 1px 0 #000000;

  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.white)};

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
