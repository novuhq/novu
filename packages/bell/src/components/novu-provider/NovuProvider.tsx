import React, { useContext, useEffect, useState } from 'react';
import { NovuContext } from '../../store/novu-provider.context';
import { ColorScheme, IAuthContext } from '../../index';
import { applyToken } from '../../shared/utils/applyToken';
import { initializeSession } from '../../api/initialize-session';
import { RootProviders } from '../notification-center/components';
import { AuthContext } from '../../store/auth.context';
import { useSocketController } from '../../store/socket/use-socket-controller';
import { SocketContext } from '../../store/socket/socket.store';
import { useSocket, useUnseenCount } from '../../hooks';
import { UnseenCountContext } from '../../store/unseen-count.context';

interface INovuProviderProps {
  children: JSX.Element | Element;
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier: string;
  colorScheme?: ColorScheme;
  bellLoading?: (isLoading: boolean) => void;
}

export function NovuProvider(props: INovuProviderProps) {
  return (
    <RootProviders>
      <SessionInitialization applicationIdentifier={props.applicationIdentifier} subscriberId={props.subscriberId}>
        <SocketInitialization>
          <UnseenProvider>
            <NovuContext.Provider
              value={{
                backendUrl: props.backendUrl,
                subscriberId: props.subscriberId,
                applicationIdentifier: props.applicationIdentifier,
                colorScheme: props.colorScheme || 'light',
                initialized: true,
                bellLoading: props.bellLoading,
              }}
            >
              {props.children}
            </NovuContext.Provider>
          </UnseenProvider>
        </SocketInitialization>
      </SessionInitialization>
    </RootProviders>
  );
}

interface ISessionInitializationProps {
  applicationIdentifier: string;
  subscriberId?: string;
  children: JSX.Element;
}

function SessionInitialization({ children, ...props }: ISessionInitializationProps) {
  const [initialized, setInitialized] = useState<boolean>(false);
  const { setToken, setUser, isLoggedIn } = useContext<IAuthContext>(AuthContext);
  useEffect(() => {
    if (props.subscriberId && props.applicationIdentifier) {
      (async () => {
        await initSession({
          clientId: props.applicationIdentifier,
          data: { $user_id: props.subscriberId },
        });
      })();
    }
  }, [props.subscriberId, props.applicationIdentifier]);

  async function initSession(payload: { clientId: string; data: { $user_id: string } }) {
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.autoResize(true);
    }

    const response = await initializeSession(payload.clientId, payload.data.$user_id);

    applyToken(response.token);
    setUser(response.profile);
    setToken(response.token);
    setInitialized(true);
  }

  return initialized && isLoggedIn ? children : null;
}

function SocketInitialization({ children }: { children: JSX.Element }) {
  const { socket } = useSocketController();

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
}

function UnseenSocketUpdate({ children }: { children: JSX.Element }) {
  const { setUnseenCount } = useContext(UnseenCountContext);
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

  return children;
}

function UnseenProvider({ children }: { children: JSX.Element }) {
  const { unseenCount, setUnseenCount } = useUnseenCount();

  return (
    <UnseenCountContext.Provider value={{ unseenCount, setUnseenCount }}>
      <UnseenSocketUpdate>{children}</UnseenSocketUpdate>
    </UnseenCountContext.Provider>
  );
}
