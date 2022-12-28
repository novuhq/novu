import React, { ReactElement, useEffect, useState, useMemo, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';
import { ApiService } from '@novu/client';

import type { I18NLanguage, ITranslationEntry } from '../../i18n/lang';
import { NotificationsProvider } from '../../store/notifications-provider.context';
import { NovuContext } from '../../store/novu-provider.context';
import { NovuI18NProvider } from '../../store/i18n.context';
import type { IStore } from '../../shared/interfaces';
import { NotificationCenterStyles, StylesProvider } from '../../store/styles';
import { applyToken } from '../../utils/token';
import type { ISession } from '../../shared/interfaces';
import { useSession } from '../../hooks/use-session.hook';
import { useInitializeSocket } from '../../hooks/use-initialize-socket.hook';
import { useFetchOrganization, useNovuContext } from '../../hooks';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  },
});

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
  styles?: NotificationCenterStyles;
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
  children,
  onLoad,
}: INovuProviderProps) {
  const backendUrl = initialBackendUrl ?? 'https://api.novu.co';
  const socketUrl = initialSocketUrl ?? 'https://ws.novu.co';
  const stores = initialStores ?? [{ storeId: 'default_store' }];

  const [isSessionInitialized, setSessionInitialized] = useState(false);

  const apiService = useMemo(() => {
    queryClient.clear();
    const service = new ApiService(backendUrl);
    applyToken({ apiService: service });

    return service;
  }, [backendUrl]);

  const { socket, initializeSocket } = useInitializeSocket({ socketUrl });

  const onSuccessfullSession = useCallback(
    (newSession: ISession) => {
      applyToken({ apiService, token: newSession.token });
      initializeSocket(newSession);
      setSessionInitialized(true);
    },
    [apiService, setSessionInitialized, initializeSocket]
  );

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
      onLoad,
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
      onLoad,
    ]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NovuContext.Provider value={contextValue}>
        <SessionInitializer onSuccess={onSuccessfullSession}>
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
