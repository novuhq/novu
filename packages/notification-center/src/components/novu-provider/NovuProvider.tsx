import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
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

export function NovuProvider(props: INovuProviderProps) {
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);
  const backendUrl = props.backendUrl ?? 'https://api.novu.co';
  const socketUrl = props.socketUrl ?? 'https://ws.novu.co';

  const { current: api } = useRef<ApiService>(new ApiService(backendUrl));

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
          <SessionInitialization onInit={setIsSessionInitialized}>
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
  onInit: (flag: boolean) => void;
  children: JSX.Element;
}

function SessionInitialization({ onInit, children }: ISessionInitializationProps) {
  const { api } = useApi();
  const { applyToken, setUser } = useAuth();
  const { applicationIdentifier, subscriberId, subscriberHash, onLoad } = useContext<INovuProviderContext>(NovuContext);

  const initSession = useCallback(async () => {
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.autoResize(true);
    }

    const response = await api.initializeSession(applicationIdentifier, subscriberId, subscriberHash);

    setUser(response.profile);
    applyToken(response.token);

    if (onLoad) {
      const organizationData = await api.getOrganization();
      onLoad({ organization: organizationData });
    }

    return response;
  }, [applicationIdentifier, subscriberId, subscriberHash]);

  useEffect(() => {
    if (subscriberId && applicationIdentifier) {
      initSession().then(() => onInit(api.isAuthenticated));
    }
  }, [subscriberId, applicationIdentifier, initSession]);

  return children;
}
