import React, { useState } from 'react';
import styled from '@emotion/styled';
import { css, cx } from '@emotion/css';

import { Loader } from '../Loader';
import { Header } from '../layout/header/Header';
import { FooterContainer as Footer } from './footer/FooterContainer';
import { useNotificationCenter, useNovuContext, useNovuTheme } from '../../../../hooks';
import { UserPreferenceHeader } from './header/UserPreferenceHeader';
import { SubscriberPreference } from '../user-preference/SubscriberPreference';
import { FeedsTabs } from '../FeedsTabs';
import { INovuTheme } from '../../../../store/novu-theme.context';
import { useStyles } from '../../../../store/styles';
import { ScreensEnum } from '../../../../shared/interfaces';

export function Layout() {
  const { header } = useNotificationCenter();
  const { isSessionInitialized } = useNovuContext();
  const { theme } = useNovuTheme();
  const [layoutStyles] = useStyles(['layout.root']);
  const [screen, setScreen] = useState<ScreensEnum>(ScreensEnum.NOTIFICATIONS);

  return (
    <div className={cx('nc-layout-wrapper', layoutWrapperCss(theme), css(layoutStyles))} data-test-id="layout-wrapper">
      {screen === ScreensEnum.SETTINGS && (
        <>
          {header ? (
            header({ setScreen })
          ) : (
            <UserPreferenceHeader onBackClick={() => setScreen(ScreensEnum.NOTIFICATIONS)} />
          )}
          <ContentWrapper>
            <SubscriberPreference />
          </ContentWrapper>
        </>
      )}
      {screen === ScreensEnum.NOTIFICATIONS && (
        <>
          {header ? header({ setScreen }) : <Header onCogClick={() => setScreen(ScreensEnum.SETTINGS)} />}
          <ContentWrapper>
            {isSessionInitialized ? (
              <MainWrapper data-test-id="main-wrapper">
                <FeedsTabs />
              </MainWrapper>
            ) : (
              <Loader />
            )}
          </ContentWrapper>
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

const MainWrapper = styled.div``;
