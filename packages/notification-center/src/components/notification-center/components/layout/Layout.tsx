import React from 'react';
import styled from '@emotion/styled';
import { css, cx } from '@emotion/css';

import { Loader } from '../Loader';
import { HeaderContainer as Header } from './header/HeaderContainer';
import { FooterContainer as Footer } from './footer/FooterContainer';
import { useNovuContext, useNovuTheme, useScreens } from '../../../../hooks';
import { UserPreferenceHeader } from './header/UserPreferenceHeader';
import { SubscriberPreference } from '../user-preference/SubscriberPreference';
import { INovuTheme } from '../../../../store/novu-theme.context';
import { ScreensEnum } from '../../../../shared/enums/screens.enum';
import { useStyles } from '../../../../store/styles';

export function Layout({ children }: { children: JSX.Element }) {
  const { initialized } = useNovuContext();
  const { theme } = useNovuTheme();
  const { screen } = useScreens();
  const [layoutStyles] = useStyles(['layout.root']);

  return (
    <div className={cx('nc-layout-wrapper', layoutWrapperCss(theme), css(layoutStyles))} data-test-id="layout-wrapper">
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
    </div>
  );
}

const ContentWrapper = styled.div`
  overflow: auto;
  min-height: 400px;
`;

const layoutWrapperCss = (novuTheme: INovuTheme) => css`
  padding: 15px 0;
  height: auto;
  border-radius: 7px;
  box-shadow: ${novuTheme.layout.boxShadow};
  background: ${novuTheme.layout.background};
`;
