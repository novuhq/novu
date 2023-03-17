import React, { useEffect } from 'react';
import { Grid } from '@mantine/core';
import styled from '@emotion/styled';

import { DotsNavigation } from '../../../../design-system';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../../constants/routes.enum';

interface IFooterLayoutProps {
  leftSide: React.ReactNode;
  rightSide: React.ReactNode;
}

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
      <LeftSide>{leftSide}</LeftSide>
      <MiddleSide>
        <DotsNavigation selectedIndex={selectedIndex} size={2} onClick={handleOnNavigationClick} />
      </MiddleSide>
      <RightSide>{rightSide}</RightSide>
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
  padding: 32px 40px;
  height: 150px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  box-shadow: inset 0 1px 0 #000000;

  @media screen and (min-width: 1369px) {
    padding: 32px 80px;
  }

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
