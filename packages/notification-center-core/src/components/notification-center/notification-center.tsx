import { Component, State, h } from '@stencil/core';
import { css, injectGlobal } from '@emotion/css';
import merge from 'lodash.merge';

import { INovuTheme, defaultCommonTheme, defaultDarkTheme, setTheme } from '../../theme';
import { ScreensEnum } from '../../types';
import { UserPreferencesTab } from '../user-preferences-tab/user-preferences-tab';
import { INovuContext, NovuContext } from '../novu-provider/novu-context';

injectGlobal`
  body {
    font-family: Lato,Helvetica,sans-serif;
    font-size: 14px;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }
`;

@Component({
  tag: 'notification-center',
})
export class NotificationCenter {
  @State() screen: ScreensEnum = ScreensEnum.NOTIFICATIONS;

  private theme: INovuTheme;

  connectedCallback() {
    // TODO: theme should be passed through the props
    this.theme = defaultDarkTheme;
    setTheme(this.theme);
  }

  handleBackToNotifications = () => {
    this.screen = ScreensEnum.NOTIFICATIONS;
  };

  handleSwitchToSettings = () => {
    this.screen = ScreensEnum.SETTINGS;
  };

  render() {
    // TODO: fontFamily
    const common = merge(defaultCommonTheme, {}); // TODO: props?.theme?.common

    return (
      <novu-provider
        backendUrl="http://localhost:3000"
        socketUrl="http://localhost:3002"
        subscriberId="62e00ab53c36d8591d8fb77c"
        applicationIdentifier="pO6TprcWFmW9"
        stores={[{ storeId: 'default_store' }, { storeId: 'test' }]}
      >
        <NovuContext.Consumer name="notification-center">
          {({ organization: { data: organization } }: INovuContext) => {
            const themeConfig = {
              colors: {
                main: this.theme.loaderColor || organization?.branding?.color,
                secondaryFontColor: this.theme.layout?.wrapper.secondaryFontColor,
              },
              fontFamily: common.fontFamily || organization?.branding?.fontFamily,
              layout: {
                direction: (organization?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
              },
            };
            const layoutHolder = css`
              margin: 0;
              font-family: ${themeConfig.fontFamily}, Helvetica, sans-serif;
              color: #333737;
              direction: ${themeConfig.layout.direction};
              width: 420px;
              z-index: 999;

              ::-moz-selection {
                background: ${themeConfig.colors.main};
              }

              *::selection {
                background: ${themeConfig.colors.main};
              }
            `;
            const layoutWrapper = css`
              padding: 15px 0;
              height: auto;
              border-radius: 7px;
              box-shadow: ${this.theme.layout.boxShadow};
              background: ${this.theme.layout.background};
            `;

            return (
              <div class={layoutHolder}>
                <div class={layoutWrapper} data-test-id="layout-wrapper">
                  {this.screen === ScreensEnum.SETTINGS ? (
                    <UserPreferencesTab onBackButtonClick={this.handleBackToNotifications} />
                  ) : (
                    <notifications-tab
                      onSettingsBtnClick={this.handleSwitchToSettings}
                      tabs={[
                        { name: 'main', storeId: 'default_store' },
                        { name: 'cool', storeId: 'test' },
                      ]}
                    />
                  )}
                  <notification-center-footer />
                </div>
              </div>
            );
          }}
        </NovuContext.Consumer>
      </novu-provider>
    );
  }
}
