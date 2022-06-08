import styled from 'styled-components';
import { Loader } from '../Loader';
import { HeaderContainer as Header } from './header/HeaderContainer';
import { FooterContainer as Footer } from './footer/FooterContainer';
import { shadows } from '../../../../shared/config/shadows';
import { colors } from '../../../../shared/config/colors';
import React, { useContext } from 'react';
import { ThemeContext } from '../../../../store/novu-theme.context';
import { useNovuContext } from 'packages/notification-center/src/hooks';

export function Layout({ children }: { children: JSX.Element }) {
  const { initialized } = useNovuContext();
  const { colorScheme } = useContext(ThemeContext);

  return (
    <LayoutWrapper colorScheme={colorScheme}>
      <Header />
      <ContentWrapper>{initialized ? children : <Loader />}</ContentWrapper>
      <Footer />
    </LayoutWrapper>
  );
}

const ContentWrapper = styled.div`
  overflow: auto;
  min-height: 400px;
`;

const LayoutWrapper = styled.div<{ colorScheme: 'light' | 'dark' }>`
  background: white;
  padding: 15px 0;
  height: auto;
  border-radius: 7px;
  box-shadow: ${({ colorScheme }) => (colorScheme === 'light' ? shadows.medium : shadows.dark)};
  background: ${({ colorScheme }) => (colorScheme === 'light' ? colors.white : colors.B15)};
`;
