import styled from 'styled-components';
import { Loader } from '../Loader';
import { HeaderContainer as Header } from './header/HeaderContainer';
import { FooterContainer as Footer } from './footer/FooterContainer';
import { shadows } from '../../../../shared/config/shadows';
import { colors } from '../../../../shared/config/colors';
import React, { useContext } from 'react';
import { NovuContext } from '../../../../store/novu-provider.context';
import { ThemeContext } from '../../../../store/novu-theme.context';

export function Layout({ children }: { children: JSX.Element }) {
  const { initialized } = useContext(NovuContext);
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
