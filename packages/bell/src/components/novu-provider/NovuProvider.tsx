import React, { useContext, useEffect, useState } from 'react';
import { NovuContext } from '../../store/novu-provider.context';
import { ColorScheme, IAuthContext } from '../../index';
import { QueryClient, QueryClientProvider } from 'react-query';
import { applyToken } from '../../shared/utils/applyToken';
import { initializeSession } from '../../api/initialize-session';
import { RootProviders } from '../notification-center/components';
import { AuthContext } from '../../store/auth.context';
import { postUsageLog } from '../../api/usage';

interface INovuProviderProps {
  children: JSX.Element | Element;
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier: string;
  colorScheme?: ColorScheme;
}

export function NovuProvider(props: INovuProviderProps) {
  return (
    <RootProviders>
      <SessionInitialization {...props}>
        <NovuContext.Provider
          value={{
            backendUrl: props.backendUrl,
            subscriberId: props.subscriberId,
            applicationIdentifier: props.applicationIdentifier,
            colorScheme: props.colorScheme || 'light',
            initialized: true,
          }}>
          {props.children}
        </NovuContext.Provider>
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
