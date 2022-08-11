import styled from 'styled-components';
import { Loader } from '../Loader';
import { HeaderContainer as Header } from './header/HeaderContainer';
import { FooterContainer as Footer } from './footer/FooterContainer';
import React, { useState } from 'react';
import { useNovuContext, useNovuThemeProvider } from '../../../../hooks';
import { INovuTheme } from '../../../../store/novu-theme.context';
import { UserPreferenceHeader } from './header/UserPreferenceHeader';
import { SubscriberPreference } from '../user-preference/SubscriberPreference';

export enum ScreensEnum {
  NOTIFICATIONS = 'notifications',
  SETTINGS = 'settings',
}

export function Layout({ children }: { children: JSX.Element }) {
  const { initialized } = useNovuContext();
  const { theme } = useNovuThemeProvider();
  const [screen, setScreen] = useState<ScreensEnum>(ScreensEnum.NOTIFICATIONS);

  return (
    <LayoutWrapper theme={theme}>
      {screen === ScreensEnum.SETTINGS && (
        <>
          <UserPreferenceHeader setScreen={setScreen} />
          <ContentWrapper>
            <SubscriberPreference />
          </ContentWrapper>
        </>
      )}
      {screen === ScreensEnum.NOTIFICATIONS && (
        <>
          <Header setScreen={setScreen} />
          <ContentWrapper>{initialized ? children : <Loader />}</ContentWrapper>
        </>
      )}

      <Footer />
    </LayoutWrapper>
  );
}

const ContentWrapper = styled.div`
  overflow: auto;
  min-height: 400px;
`;

const LayoutWrapper = styled.div<{ theme: INovuTheme }>`
  padding: 15px 0;
  height: auto;
  border-radius: 7px;
  box-shadow: ${({ theme }) => theme.layout.boxShadow};
  background: ${({ theme }) => theme.layout.background};
`;
