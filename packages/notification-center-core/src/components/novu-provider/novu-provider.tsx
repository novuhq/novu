import { Component, State, Prop, Watch, h } from '@stencil/core';
import { QueryObserverResult, QueryObserverOptions } from '@tanstack/query-core';
import { IOrganizationEntity, IMessage, ISubscriberJwt } from '@novu/shared';
import { ApiService } from '@novu/client';

import { ColorScheme, IStore, Session } from '../../types';
import { I18NLanguage, ITranslationEntry } from '../../i18n/lang';
import queryClient from '../../utils/queryClient';
import { initialNovuContext, INovuContext, NovuContext } from './novu-context';
import { AuthContext, IAuthContext } from './auth-context';

const FIVE_MINUTES = 5 * 60 * 1000;

function isBrowser() {
  return typeof window !== 'undefined';
}

function getToken(): string {
  if (isBrowser()) {
    return localStorage.getItem('widget_user_auth_token') as string;
  }

  return null;
}

@Component({
  tag: 'novu-provider',
})
export class NovuProvider {
  @Prop() stores: IStore[] = [{ storeId: 'default_store' }];
  @Prop() backendUrl?: string;
  @Prop() subscriberId?: string;
  @Prop() applicationIdentifier: string;
  @Prop() colorScheme?: ColorScheme;
  @Prop() socketUrl?: string;
  @Prop() subscriberHash?: string;
  @Prop() i18n?: I18NLanguage | ITranslationEntry;

  @State() token = getToken();
  @State() activeStore: IStore = this.stores[0];
  @State() user: ISubscriberJwt | null = null;
  @State() authContextValue: IAuthContext;
  @State() novuContextValue: INovuContext = initialNovuContext;
  @State() fetchOrgAndNotifications = false;

  private unsunscribeList: Array<() => void> = [];
  private api: ApiService;
  private sessionQueryOptions: QueryObserverOptions<Session, any> = {
    queryKey: ['session'],
    refetchOnWindowFocus: false,
    cacheTime: Infinity,
    staleTime: Infinity,
  };
  private organizationQueryOptions: QueryObserverOptions<IOrganizationEntity, any> = {
    enabled: false,
    queryKey: ['organization'],
    refetchOnWindowFocus: false,
    cacheTime: Infinity,
    staleTime: Infinity,
  };
  private notificationsQueryOptions: QueryObserverOptions<IMessage[], any> = {
    enabled: false,
    queryKey: ['notifications', this.activeStore.storeId, 0],
    refetchOnWindowFocus: false,
    cacheTime: FIVE_MINUTES,
    staleTime: FIVE_MINUTES,
  };

  connectedCallback() {
    const backendUrl = this.backendUrl ?? 'https://api.novu.co';
    const socketUrl = this.socketUrl ?? 'https://ws.novu.co';
    this.api = new ApiService(backendUrl);
    this.applyToken(this.token);
    this.novuContextValue = {
      ...this.novuContextValue,
      backendUrl,
      socketUrl,
      api: this.api,
      stores: this.stores,
      activeStore: this.activeStore,
      setActiveStore: this.setActiveStore,
    };
    this.authContextValue = {
      token: this.token,
      user: this.user,
      isLoggedIn: !!this.token,
    };
    this.resizeIframe();
  }

  disconnectedCallback() {
    this.unsunscribeList.forEach((unsubscribe) => unsubscribe());
  }

  @Watch('applicationIdentifier')
  watchApplicationIdentifierChange() {
    this.refetchAllSession();
  }

  @Watch('subscriberId')
  watchSubscriberIdChange() {
    this.refetchAllSession();
  }

  @Watch('subscriberHash')
  watchSubscriberHashChange() {
    this.refetchAllSession();
  }

  @Watch('stores')
  watchStoresChange(stores: IStore[]) {
    this.refetchAllSession();
    this.activeStore = this.stores[0];
    this.novuContextValue = {
      ...this.novuContextValue,
      stores,
      activeStore: this.activeStore,
    };
  }

  @Watch('activeStore')
  watchActiveStoreChange(newActiveStore: IStore) {
    this.notificationsQueryOptions = {
      ...this.notificationsQueryOptions,
      queryKey: ['notifications', newActiveStore.storeId, 0],
    };
  }

  private fetchSession = () =>
    this.api.initializeSession(this.applicationIdentifier, this.subscriberId, this.subscriberHash);

  private fetchOrganization = () => this.api.getOrganization();

  private fetchNotifications = () => {
    return this.api.getNotificationsList(0, this.activeStore.query);
  };

  private fetchSessionSuccess = (session: Session) => {
    this.fetchOrgAndNotifications = true;

    this.applyToken(session.token);
    this.setUser(session.profile);
  };

  private refetchAllSession() {
    this.fetchOrgAndNotifications = false;

    queryClient.refetchQueries({ queryKey: ['session'] });
    queryClient.removeQueries({ queryKey: ['organization'] });
    queryClient.removeQueries({ queryKey: ['notifications'], exact: false });
  }

  private applyToken = (newToken: string | null) => {
    if (newToken) {
      this.token = newToken;
      isBrowser() && localStorage.setItem('widget_user_auth_token', newToken);
      this.api.setAuthorizationToken(newToken);
    } else {
      this.token = null;
      isBrowser() && localStorage.removeItem('widget_user_auth_token');
      this.api.disposeAuthorizationToken();
    }
  };

  private setActiveStore = (storeId: string) => {
    const store = this.stores.find((el) => el.storeId === storeId);
    if (store) {
      this.activeStore = store;
      this.novuContextValue = {
        ...this.novuContextValue,
        activeStore: store,
      };
    }
  };

  private setUser(user: ISubscriberJwt | null) {
    this.authContextValue = {
      ...this.authContextValue,
      user,
    };
  }

  private resizeIframe() {
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.autoResize(true);
    }
  }

  private listenSessionChange = ({ isLoading, data }: QueryObserverResult<Session, any>) => {
    this.novuContextValue = {
      ...this.novuContextValue,
      session: { isLoading, data },
    };
  };

  private listenOrganizationChange = ({ isLoading, data }: QueryObserverResult<IOrganizationEntity, any>) => {
    this.novuContextValue = {
      ...this.novuContextValue,
      organization: { isLoading, data },
    };
  };

  private listenNotificationsChange = ({ isLoading, data }: QueryObserverResult<IMessage[], any>) => {
    this.novuContextValue = {
      ...this.novuContextValue,
      notifications: { isLoading, data },
    };
  };

  render() {
    return (
      <stencil-query
        options={{
          ...this.sessionQueryOptions,
          queryFn: this.fetchSession,
          onSuccess: this.fetchSessionSuccess,
        }}
        listen={this.listenSessionChange}
      >
        <stencil-query
          options={{
            ...this.organizationQueryOptions,
            enabled: this.fetchOrgAndNotifications,
            queryFn: this.fetchOrganization,
          }}
          listen={this.listenOrganizationChange}
        >
          <stencil-query
            options={{
              ...this.notificationsQueryOptions,
              enabled: this.fetchOrgAndNotifications,
              queryFn: this.fetchNotifications,
            }}
            listen={this.listenNotificationsChange}
          >
            <NovuContext.Provider value={this.novuContextValue}>
              <AuthContext.Provider value={this.authContextValue}>
                <slot />
              </AuthContext.Provider>
            </NovuContext.Provider>
          </stencil-query>
        </stencil-query>
      </stencil-query>
    );
  }
}
