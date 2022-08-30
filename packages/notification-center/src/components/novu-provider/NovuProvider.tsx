import React, { useContext, useEffect, useState } from 'react';
import { ApiService } from '@novu/client';
import { IOrganizationEntity } from '@novu/shared';
import {
  AuthProvider,
  NotificationsProvider,
  SocketInitializationProvider,
  UnseenProvider,
  NovuI18NProvider,
  NovuContext,
  ApiContext,
} from '../../store';
import { ColorScheme, INovuProviderContext, IStore } from '../../index';
import { useApi, useAuth } from '../../hooks';
import { I18NLanguage, ITranslationEntry } from '../../i18n/lang';

interface INovuProviderProps {
  stores?: IStore[];
  children: React.ReactNode;
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier: string;
  colorScheme?: ColorScheme;
  socketUrl?: string;
  onLoad?: (data: { organization: IOrganizationEntity }) => void;
  subscriberHash?: string;
  i18n?: I18NLanguage | ITranslationEntry;
}

let api: ApiService;

export function NovuProvider(props: INovuProviderProps) {
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);
  const backendUrl = props.backendUrl ?? 'https://api.novu.co';
  const socketUrl = props.socketUrl ?? 'https://ws.novu.co';

  if (!api) api = new ApiService(backendUrl);

  useEffect(() => {
    if (api?.isAuthenticated) setIsSessionInitialized(api?.isAuthenticated);
  }, [api?.isAuthenticated]);

  const stores = props.stores ?? [{ storeId: 'default_store' }];

  return (
    <NovuContext.Provider
      value={{
        backendUrl: backendUrl,
        subscriberId: props.subscriberId,
        applicationIdentifier: props.applicationIdentifier,
        initialized: isSessionInitialized,
        socketUrl: socketUrl,
        onLoad: props.onLoad,
        subscriberHash: props.subscriberHash,
        stores,
      }}
    >
      <ApiContext.Provider value={{ api }}>
        <AuthProvider>
          <SessionInitialization applicationIdentifier={props.applicationIdentifier} subscriberId={props.subscriberId}>
            <NotificationsProvider>
              <SocketInitializationProvider>
                <NovuI18NProvider i18n={props.i18n}>
                  <UnseenProvider>{props.children}</UnseenProvider>
                </NovuI18NProvider>
              </SocketInitializationProvider>
            </NotificationsProvider>
          </SessionInitialization>
        </AuthProvider>
      </ApiContext.Provider>
    </NovuContext.Provider>
  );
}

interface ISessionInitializationProps {
  applicationIdentifier: string;
  subscriberId?: string;
  children: JSX.Element;
}

function SessionInitialization({ children, ...props }: ISessionInitializationProps) {
  const { api: apiService } = useApi();
  const { applyToken, setUser } = useAuth();
  const { onLoad, subscriberHash } = useContext<INovuProviderContext>(NovuContext);

  useEffect(() => {
    if (props?.subscriberId && props?.applicationIdentifier) {
      (async (): Promise<void> => {
        await initSession({
          clientId: props.applicationIdentifier,
          data: { subscriberId: props.subscriberId },
          subscriberHash,
        });
      })();
    }
  }, [props?.subscriberId, props?.applicationIdentifier]);

  async function initSession(payload: { clientId: string; data: { subscriberId: string }; subscriberHash: string }) {
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.autoResize(true);
    }

    const response = await apiService.initializeSession(payload.clientId, payload.data.subscriberId, subscriberHash);

    api.setAuthorizationToken(response.token);

    setUser(response.profile);
    applyToken(response.token);

    const organizationData = await api.getOrganization();

    if (onLoad) {
      onLoad({ organization: organizationData });
    }
  }

  return children;
}
