import styled from 'styled-components';
import { Loader } from '../Loader';
import { Header } from './Header';
import { Footer } from './Footer';
import { useInitialization } from '../../../../hooks/use-initialization.hook';
import { shadows } from '../../../../shared/config/shadows';
import { colors } from '../../../../shared/config/colors';
import React from 'react';

export function Layout({ children }: { children: JSX.Element }) {
  const { initialized } = useInitialization();

  return (
    <LayoutWrapper>
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

const LayoutWrapper = styled.div`
  background: white;
  padding: 15px 0;
  height: auto;
  border-radius: 7px;
  box-shadow: ${({ theme }) => (theme.colorScheme === 'light' ? shadows.medium : shadows.dark)};
  background: ${({ theme }) => (theme.colorScheme === 'light' ? colors.white : colors.B15)};
`;
