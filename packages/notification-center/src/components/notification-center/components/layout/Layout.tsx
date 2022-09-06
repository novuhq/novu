import styled from 'styled-components';
import { Loader } from '../Loader';
import { HeaderContainer as Header } from './header/HeaderContainer';
import { FooterContainer as Footer } from './footer/FooterContainer';
import React from 'react';
import { useNovuContext, useNovuTheme, useScreens } from '../../../../hooks';
import { UserPreferenceHeader } from './header/UserPreferenceHeader';
import { SubscriberPreference } from '../user-preference/SubscriberPreference';
import { INovuTheme } from '../../../../store/novu-theme.context';
import { ScreensEnum } from '../../../../shared/enums/screens.enum';

export function Layout({ children }: { children: JSX.Element }) {
  const { initialized } = useNovuContext();
  const { theme } = useNovuTheme();
  const { screen } = useScreens();

  return (
    <LayoutWrapper theme={theme} data-test-id="layout-wrapper">
      {screen === ScreensEnum.SETTINGS && (
        <>
          <Header defaultHeader={<UserPreferenceHeader />} />
          <ContentWrapper>
            <SubscriberPreference />
          </ContentWrapper>
        </>
      )}
      {screen === ScreensEnum.NOTIFICATIONS && (
        <>
          <Header />
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
