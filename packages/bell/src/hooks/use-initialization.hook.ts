import { useMutation } from 'react-query';
import { useContext, useEffect, useState } from 'react';
import { ISubscriberJwt } from '@novu/shared';
import { initializeSession } from '../api/initialize-session';
import { applyToken } from '../store/use-auth-controller';
import { AuthContext } from '../store/auth.context';
import { postUsageLog } from '../api/usage';
import { IAuthContext } from '../index';
import { NovuContext } from '../store/novu-provider.context';

export function useInitialization() {
  const { setToken, setUser } = useContext<IAuthContext>(AuthContext);
  const [initialized, setInitialized] = useState<boolean>(false);
  const { mutateAsync } = useMutation<
    { token: string; profile: ISubscriberJwt },
    never,
    { clientId: string; userId: string }
  >((params) => initializeSession(params.clientId, params.userId));
  const { subscriberId, applicationIdentifier } = useContext(NovuContext);

  useEffect(() => {
    if (subscriberId && applicationIdentifier) {
      (async () => {
        await initSession({
          clientId: applicationIdentifier,
          data: { $user_id: subscriberId },
        });
      })();
    }
  }, [subscriberId, applicationIdentifier]);

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
  }, []); // empty array => run only once

  async function initSession(payload: { clientId: string; data: { $user_id: string } }) {
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.autoResize(true);
    }

    const response = await mutateAsync({
      clientId: payload.clientId,
      userId: payload.data.$user_id,
    });

    applyToken(response.token);

    setUser(response.profile);
    setToken(response.token);
    setInitialized(true);
  }

  return {
    initialized,
  };
}
