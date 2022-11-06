import { Component, Prop, h } from '@stencil/core';

import { JSX } from '../../components';
import { ITab } from '../../types';
import { ContentWrapper } from '../notification-center/content-wrapper';
import { NotificationsListTab } from './notifications-list-tab';
import { AuthContext, IAuthContext } from '../novu-provider/auth-context';
import { INovuContext, NovuContext } from '../novu-provider/novu-context';

@Component({
  tag: 'notifications-tab',
})
export class NotificationsTab {
  @Prop() tabs?: ITab[];
  @Prop() onSettingsBtnClick?: JSX.NotificationsTabHeader['onSettingsBtnClick'];

  render() {
    return (
      <NovuContext.Consumer>
        {({
          api,
          activeStore,
          setActiveStore,
          socketUrl,
          notifications: { isLoading, data: notifications },
        }: INovuContext) => (
          <AuthContext.Consumer>
            {({ token }: IAuthContext) => (
              <div>
                <notifications-tab-header unseenCount={9999} onSettingsBtnClick={this.onSettingsBtnClick} />
                <ContentWrapper>
                  <div data-test-id="main-wrapper" style={{ overflow: 'auto', maxHeight: '400px' }}>
                    {this.tabs?.length ? (
                      <tabs-component
                        tabs={this.tabs.map((tab) => {
                          const isActive = tab.storeId === activeStore.storeId;

                          return (
                            <tab-component
                              key={tab.name}
                              active={isActive}
                              label={
                                <feed-tab-label
                                  api={api}
                                  tab={tab}
                                  isActive={isActive}
                                  token={token}
                                  socketUrl={socketUrl}
                                  query={activeStore.query || {}}
                                />
                              }
                              onClick={() => {
                                setActiveStore(tab.storeId);
                              }}
                            />
                          );
                        })}
                      >
                        <NotificationsListTab isLoading={isLoading} notifications={notifications} />
                      </tabs-component>
                    ) : (
                      <NotificationsListTab isLoading={isLoading} notifications={notifications} />
                    )}
                  </div>
                </ContentWrapper>
              </div>
            )}
          </AuthContext.Consumer>
        )}
      </NovuContext.Consumer>
    );
  }
}
