import React, { useContext, useEffect, useState } from 'react';
import { NovuContext } from '../../store/novu-provider.context';
import { ColorScheme, FeedInfo, IAuthContext, INovuProviderContext } from '../../index';
import { AuthContext } from '../../store/auth.context';
import { useSocketController } from '../../store/socket/use-socket-controller';
import { SocketContext } from '../../store/socket/socket.store';
import { useSocket, useUnseenController } from '../../hooks';
import { UnseenCountContext } from '../../store/unseen-count.context';
import { ApiContext } from '../../store/api.context';
import { ApiService } from '../../api/api.service';
import { useApi } from '../../hooks/use-api.hook';
import { AuthProvider } from '../notification-center/components';
import { IOrganizationEntity } from '@novu/shared';
import { FeedsContext } from '../../store/feeds.context';

interface INovuProviderProps {
  children: React.ReactNode;
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier: string;
  colorScheme?: ColorScheme;
  socketUrl?: string;
  onLoad?: (data: { organization: IOrganizationEntity }) => void;
  subscriberHash?: string;
}

let api: ApiService;

export function NovuProvider(props: INovuProviderProps) {
  const backendUrl = props.backendUrl ?? 'https://api.novu.co';
  const socketUrl = props.socketUrl ?? 'https://ws.novu.co';
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);

  if (!api) api = new ApiService(backendUrl);

  useEffect(() => {
    if (api?.isAuthenticated) setIsSessionInitialized(api?.isAuthenticated);
  }, [api?.isAuthenticated]);

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
      }}
    >
      <ApiContext.Provider value={{ api }}>
        <AuthProvider>
          <SessionInitialization applicationIdentifier={props.applicationIdentifier} subscriberId={props.subscriberId}>
            <SocketInitialization>
              <UnseenProvider>{props.children}</UnseenProvider>
            </SocketInitialization>
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
  const { applyToken, setUser } = useContext<IAuthContext>(AuthContext);
  const { onLoad, subscriberHash } = useContext<INovuProviderContext>(NovuContext);
  const [feeds, setFeeds] = useState<FeedInfo[]>(null);

  useEffect(() => {
    if (props.subscriberId && props.applicationIdentifier) {
      (async (): Promise<void> => {
        await initSession({
          clientId: props.applicationIdentifier,
          data: { subscriberId: props.subscriberId },
          subscriberHash,
        });
      })();
    }
  }, [props.subscriberId, props.applicationIdentifier]);

  async function initSession(payload: { clientId: string; data: { subscriberId: string }; subscriberHash: string }) {
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.autoResize(true);
    }

    const response = await apiService.initializeSession(payload.clientId, payload.data.subscriberId, subscriberHash);

    api.setAuthorizationToken(response.token);

    setUser(response.profile);
    applyToken(response.token);
    setFeeds(response.feeds);

    const organizationData = await api.getOrganization();

    if (onLoad) {
      onLoad({ organization: organizationData });
    }
  }

  return <FeedsContext.Provider value={{ setFeeds, feeds }}>{children}</FeedsContext.Provider>;
}

function SocketInitialization({ children }: { children: React.ReactNode }) {
  const { socket } = useSocketController();

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
}

function UnseenProvider({ children }: { children: React.ReactNode }) {
  const { unseenCount, setUnseenCount } = useUnseenController();
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('unseen_count_changed', (onData: { unseenCount: number }) => {
        if (!isNaN(onData?.unseenCount)) {
          setUnseenCount(onData.unseenCount);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('unseen_count_changed');
      }
    };
  }, [socket]);

  return <UnseenCountContext.Provider value={{ unseenCount, setUnseenCount }}>{children}</UnseenCountContext.Provider>;
}
