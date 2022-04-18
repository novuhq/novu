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
  const [initialized, setInitialized] = useState<boolean>(false);
  const { setToken, setUser, user } = useContext<IAuthContext>(AuthContext);
  const queryClient = new QueryClient();

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

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = async (event: { data: any }) => {
      try {
        if (event.data.type === 'INIT_IFRAME') {
          await initSession(event.data.value);
          postUsageLog('Load Widget', {});
        } else if (event.data.type === 'SHOW_WIDGET') {
          postUsageLog('Open Widget', {});
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line
      (window as any).initHandler = handler;
    }

    window.addEventListener('message', handler);

    return () => window.removeEventListener('message', handler);
  }, []); // empty array => run only once on start

  return (
    <RootProviders>
      <QueryClientProvider client={queryClient}>
        <NovuContext.Provider
          value={{
            backendUrl: props.backendUrl,
            subscriberId: props.subscriberId,
            applicationIdentifier: props.applicationIdentifier,
            colorScheme: props.colorScheme || 'light',
            initialized: initialized,
          }}>
          {initialized && props.children}
        </NovuContext.Provider>
      </QueryClientProvider>
    </RootProviders>
  );

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
}
