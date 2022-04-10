import { useMutation } from 'react-query';
import { useContext, useEffect, useState } from 'react';
import { ISubscriberJwt } from '@novu/shared';
import { applyToken } from '../store/use-auth-controller';
import { AuthContext } from '../store/auth.context';
import { initializeSession } from '../api/initialize-session';
import { postUsageLog } from '../api/usage';
import { IAuthContext, IUserInfo } from '../index';
import { NovuContext } from '../store/novu-provider.context';

export function useInitialization() {
  const { setToken, setUser } = useContext<IAuthContext>(AuthContext);
  const [initialized, setInitialized] = useState<boolean>(false);
  const { mutateAsync } = useMutation<
    { token: string; profile: ISubscriberJwt },
    never,
    { clientId: string; userId: string; userInfo: IUserInfo }
  >((params) => initializeSession(params.clientId, params.userId, params.userInfo));
  const { userId, clientId, firstName, lastName, email, phone } = useContext(NovuContext);

  useEffect(() => {
    if (clientId) {
      (async () => {
        const data = getInitialSeasonDataFromContext();
        await initSeason({ data });
      })();
    }
  }, [clientId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = async (event: { data: any }) => {
      try {
        if (event.data.type === 'INIT_IFRAME') {
          await initSeason(event);

          postUsageLog('Load Widget', {});
        } else if (event.data.type === 'SHOW_WIDGET') {
          postUsageLog('Open Widget', {});
        }
        // eslint-disable-next-line no-empty
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

  async function initSeason(event: { data: any }) {
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.autoResize(true);
    }

    const payload = event.data.value;

    const response = await mutateAsync({
      clientId: payload.clientId,
      userId: payload.data.$user_id,
      userInfo: {
        firstName: payload.data.$first_name,
        lastName: payload.data.$last_name,
        email: payload.data.$email,
        phone: payload.data.$phone,
      },
    });

    applyToken(response.token);

    setUser(response.profile);
    setToken(response.token);
    setInitialized(true);
  }

  function getInitialSeasonDataFromContext() {
    return {
      event: {
        data: {
          value: {
            clientId: clientId,
            data: { $user_id: userId, $first_name: firstName, $last_name: lastName, $email: email, $phone: phone },
          },
        },
      },
    };
  }

  return {
    initialized,
  };
}
