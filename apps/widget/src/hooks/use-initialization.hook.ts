import { useMutation } from 'react-query';
import { useContext, useEffect, useState } from 'react';
import { ISubscriberJwt } from '@novu/shared';
import { initializeSession } from '../api/initialize-session';
import { applyToken } from '../store/use-auth-controller';
import { AuthContext, IAuthContext } from '../store/auth.context';
import { postUsageLog } from '../api/usage';

interface IUserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export function useInitialization() {
  const { setToken, setUser } = useContext<IAuthContext>(AuthContext);
  const [initialized, setInitialized] = useState<boolean>(false);
  const { mutateAsync } = useMutation<
    { token: string; profile: ISubscriberJwt },
    never,
    { clientId: string; userId: string; userInfo: IUserInfo }
  >((params) => initializeSession(params.clientId, params.userId, params.userInfo));

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = async (event: { data: any }) => {
      try {
        if (event.data.type === 'INIT_IFRAME') {
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

  return {
    initialized,
  };
}
