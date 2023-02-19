import React, { ReactElement, useEffect, useState, useMemo, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';
import { ApiService } from '@novu/client';

import type { I18NLanguage, ITranslationEntry } from '../../i18n/lang';
import { NotificationsProvider } from '../../store/notifications-provider.context';
import { NovuContext } from '../../store/novu-provider.context';
import { NovuI18NProvider } from '../../store/i18n.context';
import type { IStore, ISession, IFetchingStrategy } from '../../shared/interfaces';
import { INotificationCenterStyles, StylesProvider } from '../../store/styles';
import { applyToken, removeToken } from '../../utils/token';
import { useSession } from '../../hooks/useSession';
import { useInitializeSocket } from '../../hooks/useInitializeSocket';
import { useFetchOrganization, useNovuContext } from '../../hooks';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  },
});

const DEFAULT_FETCHING_STRATEGY: IFetchingStrategy = {
  fetchUnseenCount: true,
  fetchOrganization: true,
  fetchNotifications: false,
  fetchUserPreferences: false,
};

export interface INovuProviderProps {
  stores?: IStore[];
  children: React.ReactNode;
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier: string;
  socketUrl?: string;
  onLoad?: (data: { organization: IOrganizationEntity }) => void;
  subscriberHash?: string;
  i18n?: I18NLanguage | ITranslationEntry;
  styles?: INotificationCenterStyles;
  initialFetchingStrategy?: Partial<IFetchingStrategy>;
}

export function NovuProvider({
  backendUrl: initialBackendUrl,
  socketUrl: initialSocketUrl,
  applicationIdentifier,
  subscriberId,
  subscriberHash,
  stores: initialStores,
  i18n,
  styles,
  initialFetchingStrategy = DEFAULT_FETCHING_STRATEGY,
  children,
  onLoad,
}: INovuProviderProps) {
  const backendUrl = initialBackendUrl ?? 'https://api.novu.co';
  const socketUrl = initialSocketUrl ?? 'https://ws.novu.co';
  const stores = initialStores ?? [{ storeId: 'default_store' }];
  const [fetchingStrategy, setFetchingStrategyState] = useState({
    ...DEFAULT_FETCHING_STRATEGY,
    ...initialFetchingStrategy,
  });

  const [isSessionInitialized, setSessionInitialized] = useState(false);

  const apiService = useMemo(() => {
    queryClient.clear();
    const service = new ApiService(backendUrl);
    applyToken({ apiService: service });

    return service;
  }, [backendUrl]);

  const { socket, initializeSocket, disconnectSocket } = useInitializeSocket({ socketUrl });

  const onSuccessfulSession = useCallback(
    (newSession: ISession) => {
      applyToken({ apiService, token: newSession.token });
      initializeSocket(newSession);
      setSessionInitialized(true);
    },
    [apiService, setSessionInitialized, initializeSocket]
  );

  const setFetchingStrategy = useCallback(
    (strategy: Partial<IFetchingStrategy>) => setFetchingStrategyState((old) => ({ ...old, ...strategy })),
    [setFetchingStrategyState]
  );

  const logout = useCallback(() => {
    removeToken(apiService);
    disconnectSocket();
    setSessionInitialized(false);
  }, [removeToken, disconnectSocket, apiService]);

  const contextValue = useMemo(
    () => ({
      backendUrl,
      socketUrl,
      applicationIdentifier,
      subscriberId,
      subscriberHash,
      isSessionInitialized,
      apiService,
      socket,
      fetchingStrategy,
      setFetchingStrategy,
      onLoad,
      logout,
    }),
    [
      backendUrl,
      socketUrl,
      applicationIdentifier,
      subscriberId,
      subscriberHash,
      isSessionInitialized,
      apiService,
      socket,
      fetchingStrategy,
      setFetchingStrategy,
      onLoad,
      logout,
    ]
  );

  useEffect(() => disconnectSocket, [disconnectSocket]);

  return (
    <QueryClientProvider client={queryClient}>
      <NovuContext.Provider value={contextValue}>
        <SessionInitializer onSuccess={onSuccessfulSession}>
          <NotificationsProvider stores={stores}>
            <NovuI18NProvider i18n={i18n}>
              <StylesProvider styles={styles}>{children}</StylesProvider>
            </NovuI18NProvider>
          </NotificationsProvider>
        </SessionInitializer>
      </NovuContext.Provider>
    </QueryClientProvider>
  );
}

const SessionInitializer = ({
  children,
  onSuccess,
}: {
  children: ReactElement;
  onSuccess: (newSession: ISession) => void;
}) => {
  const { onLoad } = useNovuContext();

  useSession({ onSuccess });

  useFetchOrganization({
    onSuccess: (organization) => {
      onLoad?.({ organization });
    },
  });

  useEffect(() => {
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.autoResize(true);
    }
  }, []);

  return children;
};
